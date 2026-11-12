import { describe, expect, it } from "vitest";
import { pasosDelTraslado } from "./pasos-traslado";

const estados = (pasos: ReturnType<typeof pasosDelTraslado>) => pasos.map((paso) => paso.estado);

describe("pasosDelTraslado", () => {
  it("PENDIENTE: lo que sigue es el triaje", () => {
    const pasos = pasosDelTraslado({
      estado: "PENDIENTE",
      tieneTriaje: false,
      tieneDestino: false,
      fueAprobada: false,
    });
    expect(estados(pasos)).toEqual(["hecho", "actual", "pendiente", "pendiente", "pendiente", "pendiente"]);
  });

  it("EVALUANDO con destino: espera la aprobación del destino", () => {
    const pasos = pasosDelTraslado({
      estado: "EVALUANDO",
      tieneTriaje: true,
      tieneDestino: true,
      fueAprobada: false,
    });
    expect(pasos[3]).toEqual({ titulo: "Aprobada por el destino", estado: "actual" });
  });

  it("APROBADA: lo que sigue es el traslado", () => {
    const pasos = pasosDelTraslado({
      estado: "APROBADA",
      tieneTriaje: true,
      tieneDestino: true,
      fueAprobada: true,
    });
    expect(estados(pasos)).toEqual(["hecho", "hecho", "hecho", "hecho", "actual", "pendiente"]);
  });

  it("RECHAZADA antes de elegir destino: muestra hasta dónde llegó y termina en Rechazada", () => {
    const pasos = pasosDelTraslado({
      estado: "RECHAZADA",
      tieneTriaje: true,
      tieneDestino: false,
      fueAprobada: false,
    });
    expect(pasos.map((paso) => paso.titulo)).toEqual(["Solicitud creada", "Triaje", "Rechazada"]);
    expect(pasos.at(-1)?.estado).toBe("cancelado");
  });

  it("FINALIZADA: todos hechos, ninguno actual", () => {
    const pasos = pasosDelTraslado({
      estado: "FINALIZADA",
      tieneTriaje: true,
      tieneDestino: true,
      fueAprobada: true,
    });
    expect(estados(pasos).every((estado) => estado === "hecho")).toBe(true);
  });
});
