import { afterEach, describe, expect, it, vi } from "vitest";

// lib/auth.ts importa Supabase y Prisma: acá solo hacen falta sus excepciones,
// así que se reemplazan los módulos que abrirían conexiones.
vi.mock("@/lib/supabase-server", () => ({ crearClienteSupabase: vi.fn() }));
vi.mock("@/lib/db/usuarios", () => ({ registrarUsuarioSiNoExiste: vi.fn() }));

const { NoAutenticado, NoAutorizado, SinCentroAsignado } = await import("./auth");
const { responderError } = await import("./errores");

// Los valores esperados salen de docs/api.md: orden de los chequeos (401 → 403)
// y "Códigos de estado usados".

describe("responderError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sin sesión → 401 y le pide iniciar sesión", async () => {
    const respuesta = responderError("GET /api/solicitudes", new NoAutenticado());

    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error).toMatch(/Iniciá sesión/);
  });

  it("rol que no alcanza → 403 con los roles habilitados como dato aparte", async () => {
    const respuesta = responderError(
      "POST /api/solicitudes",
      new NoAutorizado(["MEDICO_DERIVANTE"]),
    );

    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual({
      error: "No podés realizar esta operación con tu rol",
      rolesHabilitados: ["MEDICO_DERIVANTE"],
    });
  });

  it("usuario sin centro asignado → 403 con 'todavía no tiene un centro de salud asignado'", async () => {
    const respuesta = responderError("GET /api/solicitudes", new SinCentroAsignado());

    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error).toMatch(
      /todavía no tiene un centro de salud asignado/,
    );
  });

  it("cualquier otra excepción → 500 sin detalles, y se loguea con el endpoint", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorDePrisma = new Error('relation "SolicitudTraslado" does not exist');

    const respuesta = responderError("GET /api/solicitudes", errorDePrisma);

    expect(respuesta.status).toBe(500);
    const body = await respuesta.json();
    expect(body).toEqual({ error: "Error interno" });
    expect(JSON.stringify(body)).not.toContain("SolicitudTraslado");
    expect(log).toHaveBeenCalledWith("GET /api/solicitudes", errorDePrisma);
  });
});
