import { describe, expect, it } from "vitest";
import {
  estaInternado,
  impedimentoParaAlta,
  impedimentoParaCambioDeUnidad,
  type Internacion,
} from "./reglas-internacion";

/**
 * Regla 7 de docs/spec.md §6. Los valores esperados salen de la regla:
 * alta y pase de unidad solo con la derivación FINALIZADA, el paciente en una
 * cama y sin alta todavía; el pase, a una unidad de otro tipo.
 */

const internado: Internacion = { estado: "FINALIZADA", tipoOcupado: "UTI", fechaAlta: null };

describe("estaInternado", () => {
  it("FINALIZADA, con cama y sin alta: está internado", () => {
    expect(estaInternado(internado)).toBe(true);
  });

  it("APROBADA o EN_CURSO: la cama está reservada, el paciente todavía no llegó", () => {
    expect(estaInternado({ ...internado, estado: "APROBADA" })).toBe(false);
    expect(estaInternado({ ...internado, estado: "EN_CURSO" })).toBe(false);
  });

  it("con alta: ya no ocupa la cama", () => {
    expect(estaInternado({ ...internado, tipoOcupado: null, fechaAlta: new Date() })).toBe(false);
  });
});

describe("impedimentoParaAlta", () => {
  it("internado: se puede dar el alta", () => {
    expect(impedimentoParaAlta(internado)).toBeNull();
  });

  it("antes de que llegue, no", () => {
    expect(impedimentoParaAlta({ ...internado, estado: "EN_CURSO" })).toBe("NO_INTERNADO");
  });

  it("dos veces, no: la segunda ya no tiene cama que liberar", () => {
    expect(impedimentoParaAlta({ ...internado, tipoOcupado: null, fechaAlta: new Date() })).toBe(
      "NO_INTERNADO",
    );
  });
});

describe("impedimentoParaCambioDeUnidad", () => {
  it("de UTI a sala común: se puede", () => {
    expect(impedimentoParaCambioDeUnidad(internado, "SALA_COMUN")).toBeNull();
  });

  it("a la misma unidad en la que está: no tiene sentido", () => {
    expect(impedimentoParaCambioDeUnidad(internado, "UTI")).toBe("MISMA_UNIDAD");
  });

  it("antes de que llegue o después del alta: no", () => {
    expect(impedimentoParaCambioDeUnidad({ ...internado, estado: "APROBADA" }, "UCO")).toBe("NO_INTERNADO");
    expect(
      impedimentoParaCambioDeUnidad({ ...internado, tipoOcupado: null, fechaAlta: new Date() }, "UCO"),
    ).toBe("NO_INTERNADO");
  });
});
