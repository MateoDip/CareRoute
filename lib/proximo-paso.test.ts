import { describe, expect, it } from "vitest";
import { proximoPaso } from "./proximo-paso";

const derivanteOrigen = { rol: "MEDICO_DERIVANTE", esOrigen: true, esDestino: false } as const;
const receptorDestino = { rol: "MEDICO_RECEPTOR", esOrigen: false, esDestino: true } as const;

describe("proximoPaso", () => {
  it("PENDIENTE: el derivante carga el triaje o rechaza", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "PENDIENTE", tieneDestino: false });
    expect(paso).toMatchObject({ cargarTriaje: true, elegirDestino: false, aprobar: false, rechazar: true });
  });

  it("EVALUANDO sin destino: el derivante elige destino", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "EVALUANDO", tieneDestino: false });
    expect(paso).toMatchObject({ elegirDestino: true, aviso: null });
  });

  it("EVALUANDO con destino: el derivante espera y puede cambiarlo", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "EVALUANDO", tieneDestino: true });
    expect(paso.elegirDestino).toBe(true);
    expect(paso.aviso).toMatch(/Esperando/);
  });

  it("EVALUANDO: el receptor del destino aprueba o rechaza", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "EVALUANDO", tieneDestino: true });
    expect(paso).toMatchObject({ aprobar: true, rechazar: true, cargarTriaje: false, elegirDestino: false });
  });

  it("APROBADA: el derivante ya no puede rechazar (regla 3)", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "APROBADA", tieneDestino: true });
    expect(paso.rechazar).toBe(false);
    expect(paso.aviso).toMatch(/solo ese centro/);
  });

  it("APROBADA: el receptor todavía puede rechazar y liberar la cama", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "APROBADA", tieneDestino: true });
    expect(paso).toMatchObject({ rechazar: true, aprobar: false });
  });

  it("un receptor que mira la solicitud desde el origen no tiene acciones", () => {
    const paso = proximoPaso({
      rol: "MEDICO_RECEPTOR",
      esOrigen: true,
      esDestino: false,
      estado: "EVALUANDO",
      tieneDestino: true,
    });
    expect(paso).toMatchObject({ cargarTriaje: false, elegirDestino: false, aprobar: false, rechazar: false });
  });

  it("RECHAZADA: nadie puede hacer nada", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "RECHAZADA", tieneDestino: true });
    expect(paso).toMatchObject({ aprobar: false, rechazar: false, iniciarTraslado: false, finalizarTraslado: false });
    expect(paso.aviso).toMatch(/rechazada/);
  });

  // Seguimiento del traslado (HU07, ADR 0011): el origen marca la salida y el
  // destino la llegada. Cada uno da fe de lo que ve.

  it("APROBADA: el derivante del origen inicia el traslado", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "APROBADA", tieneDestino: true });
    expect(paso).toMatchObject({ iniciarTraslado: true, finalizarTraslado: false });
  });

  it("APROBADA: el receptor no inicia el traslado, lo espera", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "APROBADA", tieneDestino: true });
    expect(paso).toMatchObject({ iniciarTraslado: false, finalizarTraslado: false });
  });

  it("EN_CURSO: el receptor del destino marca la llegada y ya nadie rechaza", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "EN_CURSO", tieneDestino: true });
    expect(paso).toMatchObject({ finalizarTraslado: true, iniciarTraslado: false, rechazar: false });
    expect(paso.aviso).toMatch(/en camino/);
  });

  it("EN_CURSO: el derivante espera la llegada", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "EN_CURSO", tieneDestino: true });
    expect(paso).toMatchObject({ finalizarTraslado: false, iniciarTraslado: false, rechazar: false });
    expect(paso.aviso).toMatch(/destino marca la llegada/);
  });

  it("FINALIZADA: no queda nada por hacer", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "FINALIZADA", tieneDestino: true });
    expect(paso).toMatchObject({ finalizarTraslado: false, iniciarTraslado: false, rechazar: false });
    expect(paso.aviso).toMatch(/terminó/);
  });

  it("un receptor que mira desde el origen no inicia ni finaliza", () => {
    const paso = proximoPaso({
      rol: "MEDICO_RECEPTOR",
      esOrigen: true,
      esDestino: false,
      estado: "EN_CURSO",
      tieneDestino: true,
    });
    expect(paso).toMatchObject({ iniciarTraslado: false, finalizarTraslado: false });
  });

  // Regla 7: con el paciente internado en el destino, el receptor le da el alta
  // o lo pasa a otra unidad. Nadie más.
  it("FINALIZADA con el paciente internado: el receptor del destino da el alta o lo pasa de unidad", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "FINALIZADA", tieneDestino: true, internadoEn: "UTI" });
    expect(paso).toMatchObject({ darDeAlta: true, cambiarDeUnidad: true, rechazar: false });
    expect(paso.aviso).toMatch(/internado en UTI/);
  });

  it("FINALIZADA con el paciente internado: el derivante del origen no da el alta", () => {
    const paso = proximoPaso({ ...derivanteOrigen, estado: "FINALIZADA", tieneDestino: true, internadoEn: "UTI" });
    expect(paso).toMatchObject({ darDeAlta: false, cambiarDeUnidad: false });
    expect(paso.aviso).toMatch(/internado en el centro de destino/);
  });

  it("FINALIZADA con alta: ya no hay cama que liberar", () => {
    const paso = proximoPaso({ ...receptorDestino, estado: "FINALIZADA", tieneDestino: true, internadoEn: null });
    expect(paso).toMatchObject({ darDeAlta: false, cambiarDeUnidad: false });
  });

  it("antes de que llegue el paciente no hay alta ni pase de unidad", () => {
    for (const estado of ["APROBADA", "EN_CURSO"] as const) {
      const paso = proximoPaso({ ...receptorDestino, estado, tieneDestino: true });
      expect(paso).toMatchObject({ darDeAlta: false, cambiarDeUnidad: false });
    }
  });
});
