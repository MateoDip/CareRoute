import { describe, expect, it } from "vitest";
import { z } from "zod";
import { rechazo } from "./casos/resultado";
import {
  conflicto,
  errorValidacion,
  noEncontrado,
  responderRechazo,
  STATUS_POR_MOTIVO,
} from "./http";

// Los valores esperados salen de docs/api.md, "Códigos de estado usados" y
// "Por qué 404 y no 403 cuando el recurso es de otro centro".

describe("respuestas de error", () => {
  it("errorValidacion → 400 con 'Datos inválidos' y los detalles de Zod", async () => {
    const error = z.object({ dni: z.string() }).safeParse({}).error!;
    const respuesta = errorValidacion(error);

    expect(respuesta.status).toBe(400);
    const body = await respuesta.json();
    expect(body.error).toBe("Datos inválidos");
    expect(body.detalles.fieldErrors.dni).toBeDefined();
  });

  it("noEncontrado → 404, con mensaje por defecto o propio", async () => {
    expect(noEncontrado().status).toBe(404);
    expect(await noEncontrado().json()).toEqual({ error: "El recurso no existe" });
    expect(await noEncontrado("La solicitud no existe").json()).toEqual({
      error: "La solicitud no existe",
    });
  });

  it("conflicto → 409 con los datos aparte del mensaje, no embutidos en el texto", async () => {
    const respuesta = conflicto("Solo se pueden corregir solicitudes pendientes", {
      estadoActual: "APROBADA",
    });

    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({
      error: "Solo se pueden corregir solicitudes pendientes",
      estadoActual: "APROBADA",
    });
  });
});

describe("STATUS_POR_MOTIVO", () => {
  it("no existe o es de otro centro → 404 (no se distingue, para no confirmar el id)", () => {
    expect(STATUS_POR_MOTIVO.NO_ENCONTRADA).toBe(404);
    expect(STATUS_POR_MOTIVO.CENTRO_INEXISTENTE).toBe(404);
  });

  it("una regla de dominio le niega la acción a su rol → 403", () => {
    expect(STATUS_POR_MOTIVO.ROL_NO_HABILITADO).toBe(403);
  });

  it("el estado del sistema no admite la operación → 409", () => {
    const conflictos = [
      "ESTADO_INCOMPATIBLE",
      "YA_EVALUADA",
      "FALTA_TRIAJE",
      "DESTINO_IGUAL_A_ORIGEN",
      "CAPACIDAD_AGOTADA",
      "CAMBIO_CONCURRENTE",
      "DERIVACION_ABIERTA",
      "AUTO_DEGRADACION",
      "CENTRO_CON_DEPENDENCIAS",
      "MISMA_UNIDAD",
    ] as const;

    for (const motivo of conflictos) expect(STATUS_POR_MOTIVO[motivo], motivo).toBe(409);
  });

  it("el servicio externo no respondió → 502, no 500 ni 409 (clase 7)", () => {
    expect(STATUS_POR_MOTIVO.IA_NO_DISPONIBLE).toBe(502);
  });

  it("ningún motivo de rechazo responde 500: eso queda para los bugs", () => {
    expect(Object.values(STATUS_POR_MOTIVO)).not.toContain(500);
  });
});

describe("responderRechazo", () => {
  it("usa el status del motivo, el mensaje en `error` y los datos aparte", async () => {
    const respuesta = responderRechazo(
      rechazo("CAPACIDAD_AGOTADA", "El centro no tiene camas libres de ese tipo", {
        tiposDisponibles: ["SALA_COMUN"],
      }),
    );

    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({
      error: "El centro no tiene camas libres de ese tipo",
      tiposDisponibles: ["SALA_COMUN"],
    });
  });

  it("sin datos, el body es solo el mensaje", async () => {
    const respuesta = responderRechazo(rechazo("NO_ENCONTRADA", "La solicitud no existe"));

    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: "La solicitud no existe" });
  });
});
