import type { UsuarioConCentro } from "@/lib/auth";
import { buscarDerivacionAbierta, crearSolicitud } from "@/lib/db/solicitudes";
import type { CrearSolicitud } from "@/lib/schemas/solicitud-traslado";
import { exito, rechazo, type Resultado } from "./resultado";

type SolicitudCreada = NonNullable<Awaited<ReturnType<typeof crearSolicitud>>>;

/**
 * HU01 — el médico derivante inicia una solicitud con el DNI del paciente.
 *
 * El centro de origen sale del usuario de la sesión, nunca de los datos: así no
 * se puede iniciar una derivación a nombre de otro hospital.
 *
 * Regla 6 (spec §6, clase 14): un paciente no puede tener más de una derivación
 * abierta desde el mismo centro. No hay un `if` que pregunte antes: la cumple la
 * base con un índice único, y acá solo se traduce su rechazo. El 409 dice cuál
 * es la derivación abierta, para que la pantalla lleve al médico a esa.
 */
export async function iniciarSolicitud(
  usuario: UsuarioConCentro,
  datos: CrearSolicitud,
): Promise<Resultado<SolicitudCreada>> {
  const solicitud = await crearSolicitud(datos, usuario.centroSaludId);
  if (solicitud) return exito(solicitud);

  const abierta = await buscarDerivacionAbierta(usuario.centroSaludId, datos.pacienteDni);
  return derivacionAbierta(abierta?.id);
}

/** El rechazo de la regla 6, igual al crear y al corregir el DNI. */
export function derivacionAbierta(solicitudAbiertaId?: string) {
  return rechazo(
    "DERIVACION_ABIERTA",
    "El paciente ya tiene una derivación abierta desde tu centro",
    solicitudAbiertaId ? { solicitudAbiertaId } : undefined,
  );
}
