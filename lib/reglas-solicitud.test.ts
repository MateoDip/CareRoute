import { describe, expect, it } from "vitest";
import {
  esTerminal,
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
