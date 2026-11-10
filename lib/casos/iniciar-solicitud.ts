import type { UsuarioConCentro } from "@/lib/auth";
import { crearSolicitud } from "@/lib/db/solicitudes";
import type { CrearSolicitud } from "@/lib/schemas/solicitud-traslado";
import { exito, type Resultado } from "./resultado";

/**
 * HU01 — el médico derivante inicia una solicitud con el DNI del paciente.
 *
 * El centro de origen sale del usuario de la sesión, nunca de los datos: así no
 * se puede iniciar una derivación a nombre de otro hospital. Hoy no hay regla que
 * la rechace; el caso existe para que la API y la pantalla escriban por el mismo
 * camino cuando aparezca una.
 */
export async function iniciarSolicitud(
  usuario: UsuarioConCentro,
  datos: CrearSolicitud,
): Promise<Resultado<Awaited<ReturnType<typeof crearSolicitud>>>> {
  return exito(await crearSolicitud(datos, usuario.centroSaludId));
}
