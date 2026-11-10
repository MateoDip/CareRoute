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
    expect(paso).toMatchObject({ aprobar: false, rechazar: false });
    expect(paso.aviso).toMatch(/rechazada/);
  });
});
