/**
 * Qué devuelve un caso de uso (clase 12).
 *
 * Un caso de uso no lanza cuando una regla dice que no: devuelve el motivo, que
 * sale de un conjunto cerrado. El Route Handler lo traduce a un status HTTP
 * (`STATUS_POR_MOTIVO`, lib/http.ts) y la Server Action a un mensaje arriba del
 * formulario. Agregar un motivo acá obliga a decidir su código HTTP: si no, el
 * typecheck falla.
 *
 * Sesión y rol no son motivos: los resuelve requerirUsuario* antes de llamar al
 * caso (401/403 en la API, /ingresar o 404 en las pantallas).
 */
export type MotivoDeRechazo =
  | "NO_ENCONTRADA"
  | "CENTRO_INEXISTENTE"
  | "ROL_NO_HABILITADO"
  | "ESTADO_INCOMPATIBLE"
  | "YA_EVALUADA"
  | "FALTA_TRIAJE"
  | "DESTINO_IGUAL_A_ORIGEN"
  | "CAPACIDAD_AGOTADA"
  | "CAMBIO_CONCURRENTE"
  | "IA_NO_DISPONIBLE";

/**
 * `mensaje` lo lee una persona; `datos` lo usa un programa (la lista de
 * transiciones posibles, los tipos de cama libres…). Van separados para que la
 * pantalla no tenga que parsear castellano.
 */
export type Rechazo = {
  ok: false;
  motivo: MotivoDeRechazo;
  mensaje: string;
  datos?: Record<string, unknown>;
};

export type Resultado<T> = { ok: true; valor: T } | Rechazo;

export function exito<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function rechazo(
  motivo: MotivoDeRechazo,
  mensaje: string,
  datos?: Record<string, unknown>,
): Rechazo {
  return { ok: false, motivo, mensaje, datos };
}
