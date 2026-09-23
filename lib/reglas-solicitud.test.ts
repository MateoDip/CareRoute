import { describe, expect, it } from "vitest";
import {
  esTerminal,
  impedimentoParaAprobar,
  liberaCamaAlRechazar,
  puedeEditarse,
  puedeTransicionar,
  rolesQuePuedenRechazar,
  transicionesPosibles,
} from "./reglas-solicitud";

describe("puedeTransicionar", () => {
  it("permite el camino feliz completo del flujo principal", () => {
    expect(puedeTransicionar("PENDIENTE", "EVALUANDO")).toBe(true);
    expect(puedeTransicionar("EVALUANDO", "APROBADA")).toBe(true);
    expect(puedeTransicionar("APROBADA", "EN_CURSO")).toBe(true);
    expect(puedeTransicionar("EN_CURSO", "FINALIZADA")).toBe(true);
  });

  it("no deja aprobar una solicitud sin evaluación de triaje", () => {
    expect(puedeTransicionar("PENDIENTE", "APROBADA")).toBe(false);
  });

  it("no deja aprobar dos veces la misma solicitud", () => {
    expect(puedeTransicionar("APROBADA", "APROBADA")).toBe(false);
  });

  // Borde: los estados terminales no vuelven atrás por ningún camino.
  it("no permite salir de FINALIZADA ni de RECHAZADA", () => {
    expect(transicionesPosibles("FINALIZADA")).toEqual([]);
    expect(transicionesPosibles("RECHAZADA")).toEqual([]);
    expect(puedeTransicionar("FINALIZADA", "EN_CURSO")).toBe(false);
  });

  it("no deja saltear el traslado: de APROBADA no se pasa a FINALIZADA", () => {
    expect(puedeTransicionar("APROBADA", "FINALIZADA")).toBe(false);
  });
});

describe("transicionesPosibles", () => {
  it("enumera las alternativas, que es lo que el 409 le devuelve al cliente", () => {
    expect(transicionesPosibles("EVALUANDO")).toEqual(["APROBADA", "RECHAZADA"]);
  });

  it("devuelve una copia: mutarla no altera la tabla de transiciones", () => {
    transicionesPosibles("PENDIENTE").push("FINALIZADA");
    expect(transicionesPosibles("PENDIENTE")).toEqual(["EVALUANDO", "RECHAZADA"]);
  });
});

describe("esTerminal", () => {
  it("marca FINALIZADA como terminal y EN_CURSO como no terminal", () => {
    expect(esTerminal("FINALIZADA")).toBe(true);
    expect(esTerminal("EN_CURSO")).toBe(false);
  });
});

describe("puedeEditarse", () => {
  it("permite corregir datos solo mientras está PENDIENTE", () => {
    expect(puedeEditarse("PENDIENTE")).toBe(true);
    expect(puedeEditarse("EVALUANDO")).toBe(false);
    expect(puedeEditarse("APROBADA")).toBe(false);
  });
});

describe("rolesQuePuedenRechazar", () => {
  it("antes de aprobar, cualquiera de los dos médicos puede echarse atrás", () => {
    expect(rolesQuePuedenRechazar("EVALUANDO")).toEqual([
      "MEDICO_DERIVANTE",
      "MEDICO_RECEPTOR",
    ]);
  });

  // La regla de la spec §6: ya aprobada, el emisor no cancela unilateralmente.
  it("una vez APROBADA, solo el receptor puede rechazarla", () => {
    expect(rolesQuePuedenRechazar("APROBADA")).toEqual(["MEDICO_RECEPTOR"]);
    expect(rolesQuePuedenRechazar("APROBADA")).not.toContain("MEDICO_DERIVANTE");
  });

  // Borde: si el estado no admite rechazo, no hay rol que lo habilite.
  it("nadie puede rechazar un traslado en curso o finalizado", () => {
    expect(rolesQuePuedenRechazar("EN_CURSO")).toEqual([]);
    expect(rolesQuePuedenRechazar("FINALIZADA")).toEqual([]);
  });
});

describe("impedimentoParaAprobar", () => {
  const centros = { centroOrigenId: "origen", centroDestinoId: "destino" };

  it("no hay impedimento si está EVALUANDO y el destino es otro centro", () => {
    expect(impedimentoParaAprobar({ estado: "EVALUANDO", ...centros })).toBeNull();
  });

  it("una solicitud ya APROBADA no se aprueba de nuevo, y enumera qué sí se puede", () => {
    expect(impedimentoParaAprobar({ estado: "APROBADA", ...centros })).toEqual({
      motivo: "ESTADO_INCOMPATIBLE",
      estadoActual: "APROBADA",
      transicionesPosibles: ["EN_CURSO", "RECHAZADA"],
    });
  });

  // Borde: PENDIENTE todavía no pasó por el triaje, así que no puede saltar a APROBADA.
  it("una PENDIENTE no se puede aprobar sin pasar por EVALUANDO", () => {
    expect(impedimentoParaAprobar({ estado: "PENDIENTE", ...centros })?.motivo).toBe(
      "ESTADO_INCOMPATIBLE",
    );
  });

  it("no se puede derivar al mismo centro de origen", () => {
    expect(
      impedimentoParaAprobar({
        estado: "EVALUANDO",
        centroOrigenId: "origen",
        centroDestinoId: "origen",
      }),
    ).toEqual({ motivo: "DESTINO_IGUAL_A_ORIGEN" });
  });

  // Borde: si fallan las dos, gana el estado — es el que explica qué se puede hacer.
  it("con estado inválido y mismo centro, informa primero el estado", () => {
    expect(
      impedimentoParaAprobar({
        estado: "RECHAZADA",
        centroOrigenId: "origen",
        centroDestinoId: "origen",
      })?.motivo,
    ).toBe("ESTADO_INCOMPATIBLE");
  });
});

describe("liberaCamaAlRechazar", () => {
  it("devuelve la cama solo si la solicitud estaba APROBADA", () => {
    expect(liberaCamaAlRechazar("APROBADA")).toBe(true);
  });

  // Borde: antes de aprobar no se reservó nada, no hay que sumar camas.
  it("no libera nada si todavía estaba PENDIENTE o EVALUANDO", () => {
    expect(liberaCamaAlRechazar("PENDIENTE")).toBe(false);
    expect(liberaCamaAlRechazar("EVALUANDO")).toBe(false);
  });
});
