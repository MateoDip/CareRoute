import { z } from "zod";
import {
  nivelUrgenciaSchema,
  type NivelUrgencia,
  type SignosVitales,
} from "../schemas/evaluacion-triaje";

/**
 * Único punto de contacto con OpenAI (clase 7, ADR 0003).
 *
 * Las cuatro reglas del módulo de servicio externo:
 *  1. Timeout siempre: `AbortSignal.timeout` corta el pedido y también la lectura
 *     del body. Sin esto, si OpenAI se cuelga, el request del médico se cuelga.
 *  2. Devuelve, no lanza: ante cualquier falla devuelve `null`. Qué hacer con ese
 *     null lo decide el handler (acá es 502 e ingreso manual, H2).
 *  3. La credencial vive acá y solo acá: `OPENAI_API_KEY`, sin `NEXT_PUBLIC_`.
 *  4. Loguea la falla con contexto (el id de la solicitud y el error del
 *     proveedor), nunca los signos vitales: AGENTS.md §2.3.
 *
 * Qué se manda: solo los tres signos vitales. Ni el DNI ni nada que identifique
 * al paciente sale del sistema.
 */

/**
 * RNF01 pide la sugerencia en menos de 10 s. 8 s para OpenAI deja margen para
 * la sesión, las consultas y la respuesta del propio handler.
 */
const TIMEOUT_MS = 8_000;
const MODELO = "gpt-4o-mini";
const URL_POR_DEFECTO = "https://api.openai.com/v1";

const INSTRUCCIONES = [
  "Sos un asistente de apoyo al triaje de derivaciones inter-hospitalarias.",
  "Con los signos vitales de un paciente adulto, sugerí un nivel de urgencia:",
  "BAJO, MEDIO, ALTO o CRITICO. Es una sugerencia que revisa un médico, no un diagnóstico.",
].join(" ");

/** Structured Outputs: OpenAI garantiza este formato; igual lo validamos con Zod. */
const FORMATO_RESPUESTA = {
  type: "json_schema",
  json_schema: {
    name: "sugerencia_triaje",
    strict: true,
    schema: {
      type: "object",
      properties: {
        nivelUrgencia: {
          type: "string",
          enum: nivelUrgenciaSchema.options,
        },
      },
      required: ["nivelUrgencia"],
      additionalProperties: false,
    },
  },
} as const;

/** La parte de la respuesta de /chat/completions que usamos. El resto se ignora. */
const respuestaOpenAISchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
      }),
    )
    .min(1),
});

const sugerenciaSchema = z.object({ nivelUrgencia: nivelUrgenciaSchema });

function jsonOVacio(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/**
 * Pide a OpenAI un nivel de urgencia sugerido para estos signos vitales.
 *
 * Devuelve `null` si falta la credencial, si OpenAI responde con error, si tarda
 * más de TIMEOUT_MS o si la respuesta no tiene la forma esperada.
 */
export async function sugerirNivelUrgencia(
  signos: SignosVitales,
  solicitudId: string,
): Promise<NivelUrgencia | null> {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) {
    console.error("openai: falta OPENAI_API_KEY", { solicitudId });
    return null;
  }
  const base = process.env.OPENAI_BASE_URL ?? URL_POR_DEFECTO;

  try {
    const respuesta = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0,
        response_format: FORMATO_RESPUESTA,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: JSON.stringify(signos) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      // El body de error de OpenAI dice qué pasó (clave inválida, cuota, etc.).
      const detalle = await respuesta.text().catch(() => "");
      console.error("openai: el proveedor respondió con error", {
        solicitudId,
        status: respuesta.status,
        detalle: detalle.slice(0, 300),
      });
      return null;
    }

    const cuerpo = respuestaOpenAISchema.safeParse(await respuesta.json());
    const contenido = cuerpo.success
      ? cuerpo.data.choices[0]?.message.content
      : null;
    const sugerencia = sugerenciaSchema.safeParse(
      contenido ? jsonOVacio(contenido) : null,
    );
    if (!sugerencia.success) {
      console.error("openai: respuesta con formato inesperado", {
        solicitudId,
      });
      return null;
    }

    return sugerencia.data.nivelUrgencia;
  } catch (error) {
    // TimeoutError (se pasó de TIMEOUT_MS), red caída, DNS, JSON cortado...
    console.error("openai: no se pudo obtener la sugerencia", {
      solicitudId,
      error: error instanceof Error ? `${error.name}: ${error.message}` : error,
    });
    return null;
  }
}
