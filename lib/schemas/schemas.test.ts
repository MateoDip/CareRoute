import { describe, expect, it } from "vitest";
import { actualizarCentroSchema, crearCentroSchema } from "./centro-salud";
import { crearEvaluacionSchema } from "./evaluacion-triaje";
import { crearSolicitudSchema, idSchema } from "./solicitud-traslado";
import { actualizarUnidadSchema } from "./unidad-cuidados";
import { actualizarUsuarioSchema } from "./usuario";

/** Las fronteras: lo que Zod deja pasar y lo que frena con 400. */

describe("idSchema", () => {
  it("acepta los ids reales, que son cuid y no UUID", () => {
    expect(idSchema.safeParse("cm1x2y3z40000abcd1234efgh").success).toBe(true);
    expect(idSchema.safeParse("centro-origen-1").success).toBe(true);
  });

  it("rechaza el id vacío o solo espacios", () => {
    expect(idSchema.safeParse("   ").success).toBe(false);
  });
});

describe("crearSolicitudSchema", () => {
  it("acepta un DNI de 7 a 10 dígitos", () => {
    expect(crearSolicitudSchema.safeParse({ pacienteDni: "1234567" }).success).toBe(true);
  });

  it("descarta los campos que no le corresponden al cliente", () => {
    const datos = crearSolicitudSchema.parse({
      pacienteDni: "12345678",
      estado: "APROBADA",
      centroOrigenId: "otro",
    });
    expect(datos).toEqual({ pacienteDni: "12345678" });
  });

  it("rechaza letras y el límite de 6 dígitos", () => {
    expect(crearSolicitudSchema.safeParse({ pacienteDni: "12a45678" }).success).toBe(false);
    expect(crearSolicitudSchema.safeParse({ pacienteDni: "123456" }).success).toBe(false);
  });
});

describe("crearEvaluacionSchema", () => {
  const signos = { frecuenciaCardiaca: 80, presionSistolica: 120, presionDiastolica: 80 };

  it("el nivel es opcional: sin nivel lo sugiere la IA (clase 7)", () => {
    expect(crearEvaluacionSchema.safeParse(signos).success).toBe(true);
  });

  it("rechaza un signo vital fuera de rango", () => {
    expect(
      crearEvaluacionSchema.safeParse({ ...signos, presionSistolica: 900 }).success,
    ).toBe(false);
  });

  it("rechaza un nivel que no está en el enum", () => {
    expect(
      crearEvaluacionSchema.safeParse({ ...signos, nivelUrgenciaSugerido: "GRAVE" }).success,
    ).toBe(false);
  });
});

describe("actualizarUnidadSchema", () => {
  it("cero camas es válido (límite)", () => {
    expect(actualizarUnidadSchema.safeParse({ camasDisponibles: 0 }).success).toBe(true);
  });

  it("camas negativas no (caso de error de HU05)", () => {
    expect(actualizarUnidadSchema.safeParse({ camasDisponibles: -1 }).success).toBe(false);
  });

  it("un body vacío no modifica nada: se rechaza", () => {
    expect(actualizarUnidadSchema.safeParse({}).success).toBe(false);
  });
});

describe("centro de salud", () => {
  it("crea con nombre, complejidad y ubicación", () => {
    expect(
      crearCentroSchema.safeParse({
        nombre: "Hospital X",
        nivelComplejidad: "ALTA",
        ubicacion: "Calle 1234",
      }).success,
    ).toBe(true);
  });

  it("rechaza una complejidad inventada", () => {
    expect(
      crearCentroSchema.safeParse({
        nombre: "Hospital X",
        nivelComplejidad: "ENORME",
        ubicacion: "Calle 1234",
      }).success,
    ).toBe(false);
  });

  it("el PATCH necesita al menos un campo", () => {
    expect(actualizarCentroSchema.safeParse({}).success).toBe(false);
  });
});

describe("actualizarUsuarioSchema", () => {
  it("centroSaludId null le quita el centro", () => {
    expect(actualizarUsuarioSchema.safeParse({ centroSaludId: null }).success).toBe(true);
  });

  it("rechaza un rol que no existe", () => {
    expect(actualizarUsuarioSchema.safeParse({ rol: "SUPERADMIN" }).success).toBe(false);
  });

  it("un body vacío se rechaza", () => {
    expect(actualizarUsuarioSchema.safeParse({}).success).toBe(false);
  });
});
