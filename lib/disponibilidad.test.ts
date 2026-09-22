import { describe, expect, it } from "vitest";
import {
  centrosElegibles,
  tiposConCamaLibre,
  unidadConCamaLibre,
  type UnidadDisponible,
} from "./disponibilidad";

const uti = (camas: number): UnidadDisponible => ({
  id: "u-uti",
  tipo: "UTI",
  camasDisponibles: camas,
});
const uco = (camas: number): UnidadDisponible => ({
  id: "u-uco",
  tipo: "UCO",
  camasDisponibles: camas,
});

describe("unidadConCamaLibre", () => {
  it("devuelve la unidad cuando hay camas del tipo requerido", () => {
    expect(unidadConCamaLibre([uti(3), uco(1)], "UTI")?.id).toBe("u-uti");
  });

  it("devuelve null cuando el centro no tiene ese tipo de unidad", () => {
    expect(unidadConCamaLibre([uco(2)], "UTI")).toBeNull();
  });

  // Borde: el caso de error de H3 — la unidad existe pero quedó en cero.
  it("devuelve null con exactamente 0 camas", () => {
    expect(unidadConCamaLibre([uti(0)], "UTI")).toBeNull();
  });

  // Borde: una sola cama alcanza. Es el límite del > 0.
  it("devuelve la unidad con exactamente 1 cama", () => {
    expect(unidadConCamaLibre([uti(1)], "UTI")?.camasDisponibles).toBe(1);
  });

  it("no confunde tipos: hay camas en UCO pero se pide UTI", () => {
    expect(unidadConCamaLibre([uti(0), uco(5)], "UTI")).toBeNull();
  });

  it("devuelve null si el centro no tiene ninguna unidad cargada", () => {
    expect(unidadConCamaLibre([], "UTI")).toBeNull();
  });
});

describe("tiposConCamaLibre", () => {
  it("enumera solo los tipos con camas, para ofrecer alternativas en el 409", () => {
    expect(tiposConCamaLibre([uti(0), uco(2)])).toEqual(["UCO"]);
  });

  it("devuelve lista vacía cuando el centro está completo", () => {
    expect(tiposConCamaLibre([uti(0), uco(0)])).toEqual([]);
  });
});

describe("centrosElegibles", () => {
  const centros = [
    { id: "origen", unidades: [uti(4)] },
    { id: "con-uti", unidades: [uti(2), uco(0)] },
    { id: "sin-uti", unidades: [uti(0), uco(3)] },
  ];

  it("deja solo los centros con cama del tipo requerido", () => {
    expect(centrosElegibles(centros, "UTI", "origen").map((c) => c.id)).toEqual([
      "con-uti",
    ]);
  });

  // Borde: el centro de origen tiene camas, pero derivar a uno mismo no es derivar.
  it("excluye siempre al centro de origen", () => {
    expect(centrosElegibles(centros, "UTI", "origen").map((c) => c.id)).not.toContain(
      "origen",
    );
  });

  it("devuelve lista vacía cuando ningún centro tiene el tipo pedido", () => {
    expect(centrosElegibles(centros, "SALA_COMUN", "origen")).toEqual([]);
  });
});
