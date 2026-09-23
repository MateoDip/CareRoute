import { describe, expect, it } from "vitest";
import {
  rankearCandidatos,
  unidadRequerida,
  type CentroConUnidades,
} from "./scoring-hospitales";

const centro = (
  id: string,
  camasUti: number,
  extra: Partial<CentroConUnidades> = {},
): CentroConUnidades => ({
  id,
  nombre: id,
  ubicacion: "-",
  nivelComplejidad: "ALTA",
  unidades: [
    { id: `${id}-uti`, tipo: "UTI", camasDisponibles: camasUti },
    { id: `${id}-uco`, tipo: "UCO", camasDisponibles: 5 },
  ],
  recursosOperativos: 0,
  ...extra,
});

describe("unidadRequerida", () => {
  it("CRITICO y ALTO van a UTI, MEDIO a UCO, BAJO a sala común", () => {
    expect(unidadRequerida("CRITICO")).toBe("UTI");
    expect(unidadRequerida("ALTO")).toBe("UTI");
    expect(unidadRequerida("MEDIO")).toBe("UCO");
    expect(unidadRequerida("BAJO")).toBe("SALA_COMUN");
  });
});

describe("rankearCandidatos", () => {
  it("ordena de mayor a menor puntaje", () => {
    const ranking = rankearCandidatos(
      [centro("pocas", 1), centro("muchas", 8)],
      "UTI",
      "origen",
    );
    expect(ranking.map((c) => c.id)).toEqual(["muchas", "pocas"]);
  });

  // Borde: el caso de error de H3 — sin cama del tipo pedido, no aparece.
  it("no ofrece centros con 0 camas del tipo requerido", () => {
    const ranking = rankearCandidatos([centro("sin-uti", 0)], "UTI", "origen");
    expect(ranking).toEqual([]);
  });

  it("excluye al centro de origen aunque tenga camas", () => {
    const ranking = rankearCandidatos([centro("origen", 9)], "UTI", "origen");
    expect(ranking).toEqual([]);
  });

  // Borde: las camas de otro tipo no suman al puntaje del tipo pedido.
  it("cuenta solo las camas del tipo requerido", () => {
    const [unico] = rankearCandidatos([centro("c", 2)], "UTI", "origen");
    expect(unico?.camasDisponibles).toBe(2);
  });
});
