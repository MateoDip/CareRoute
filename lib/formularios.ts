import { z, type ZodError } from "zod";
import type { Rechazo } from "@/lib/casos/resultado";

/**
 * Lo que viaja entre una Server Action y su formulario (clase 12).
 *
 * Una acción que sale bien no devuelve estado: hace redirect. Lo que vuelve es
 * siempre un problema, con su lugar en la pantalla:
 *  - `errores`: validación (lo que en la API es 400), debajo de cada campo.
 *  - `error`: regla de negocio o servicio caído (409 / 502), arriba del formulario.
 *  - `valores`: lo que la persona escribió, para que el formulario no se vacíe.
 */
export type EstadoFormulario = {
  error?: string;
  errores?: Partial<Record<string, string[]>>;
  valores?: Record<string, string>;
};

export const SIN_ENVIAR: EstadoFormulario = {};

/** La firma de toda Server Action usada con useActionState (ids ya fijados con .bind). */
export type AccionDeFormulario = (
  estado: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>;

/** Los campos de texto enviados, tal cual, para volver a mostrarlos. */
export function valoresDe(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of formData.entries()) {
    if (typeof valor === "string" && !campo.startsWith("$")) valores[campo] = valor;
  }
  return valores;
}

/**
 * Un campo numérico del formulario, para pasarlo al schema de Zod existente
 * (que espera number). Vacío → undefined ("Completá este campo"); texto que no
 * es número → NaN ("Ingresá un número"). Acepta coma decimal.
 */
export function numeroDe(formData: FormData, campo: string): number | undefined {
  const valor = formData.get(campo);
  if (typeof valor !== "string" || valor.trim() === "") return undefined;
  return Number(valor.trim().replace(",", "."));
}

/** Un <select> con una opción vacía ("Elegí…") → undefined si no eligió nada. */
export function opcionDe(formData: FormData, campo: string): string | undefined {
  const valor = formData.get(campo);
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}

/**
 * Mensajes de Zod en castellano para lo que los schemas no traen escrito
 * (campo vacío, número inválido, opción fuera de la lista). Los mensajes propios
 * de cada schema ("Presión sistólica fuera de rango") tienen prioridad.
 */
export const mensajesEnCastellano: z.ZodErrorMap = (problema, contexto) => {
  if (problema.code === z.ZodIssueCode.invalid_type) {
    if (problema.received === "undefined") return { message: "Completá este campo" };
    if (problema.received === "nan") return { message: "Ingresá un número" };
  }
  if (problema.code === z.ZodIssueCode.invalid_enum_value) {
    return { message: "Elegí una opción de la lista" };
  }
  return { message: contexto.defaultError };
};

/** Validación fallida → un mensaje debajo de cada campo, conservando lo escrito. */
export function estadoDeValidacion(error: ZodError, formData: FormData): EstadoFormulario {
  return { errores: error.flatten().fieldErrors, valores: valoresDe(formData) };
}

/** Regla de negocio o servicio caído → un mensaje arriba del formulario. */
export function estadoDeRechazo(rechazo: Rechazo, formData: FormData): EstadoFormulario {
  return { error: rechazo.mensaje, valores: valoresDe(formData) };
}
