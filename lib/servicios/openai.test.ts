import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sugerirNivelUrgencia } from "./openai";

/**
 * No se llama a OpenAI de verdad: se reemplaza `fetch` por un doble. Lo que se
 * prueba es la regla del módulo — ante cualquier falla devuelve null, no lanza —
 * y que la respuesta buena se valide antes de usarse.
 */

const signos = {
  frecuenciaCardiaca: 130,
  presionSistolica: 85,
  presionDiastolica: 50,
};

function respuestaOpenAI(contenido: string | null, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: contenido } }] }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const fetchFalso = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-prueba");
  vi.stubGlobal("fetch", fetchFalso);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchFalso.mockReset();
});

describe("sugerirNivelUrgencia", () => {
  it("devuelve el nivel que sugiere OpenAI", async () => {
    fetchFalso.mockResolvedValue(
      respuestaOpenAI(JSON.stringify({ nivelUrgencia: "CRITICO" })),
    );

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBe(
      "CRITICO",
    );
  });

  it("manda solo los signos vitales, con timeout y la clave en el header", async () => {
    fetchFalso.mockResolvedValue(
      respuestaOpenAI(JSON.stringify({ nivelUrgencia: "ALTO" })),
    );

    await sugerirNivelUrgencia(signos, "sol-1");

    const [, opciones] = fetchFalso.mock.calls[0] ?? [];
    expect(opciones?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(opciones?.headers).get("Authorization")).toBe(
      "Bearer sk-prueba",
    );
    const cuerpo = JSON.parse(String(opciones?.body)) as {
      messages: { content: string }[];
    };
    expect(JSON.parse(cuerpo.messages[1]?.content ?? "")).toEqual(signos);
  });

  it("sin credencial devuelve null y no llama a OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("credencial inválida (401) devuelve null y loguea el error del proveedor", async () => {
    fetchFalso.mockResolvedValue(
      new Response('{"error":{"message":"Incorrect API key provided"}}', {
        status: 401,
      }),
    );

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "openai: el proveedor respondió con error",
      expect.objectContaining({ solicitudId: "sol-1", status: 401 }),
    );
  });

  it("timeout devuelve null en lugar de lanzar", async () => {
    fetchFalso.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
  });

  it("un nivel que no existe en el enum devuelve null", async () => {
    fetchFalso.mockResolvedValue(
      respuestaOpenAI(JSON.stringify({ nivelUrgencia: "GRAVISIMO" })),
    );

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
  });

  it("contenido que no es JSON devuelve null", async () => {
    fetchFalso.mockResolvedValue(respuestaOpenAI("no es json"));

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
  });

  it("respuesta sin choices (lista vacía) devuelve null", async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    );

    await expect(sugerirNivelUrgencia(signos, "sol-1")).resolves.toBeNull();
  });
});
