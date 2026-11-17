import type { UsuarioConCentro } from "@/lib/auth";
import { darDeAlta as liberarCama, obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { impedimentoParaAlta } from "@/lib/reglas-internacion";
import { exito, rechazo, type Resultado } from "./resultado";

type SolicitudConAlta = NonNullable<Awaited<ReturnType<typeof liberarCama>>>;

/**
 * Regla 7 — el receptor del centro de destino da de alta al paciente internado:
 * su cama vuelve a quedar libre y queda "Alta del paciente" en la bitácora.
 *
 * Solo con la derivación FINALIZADA (el paciente ya llegó) y una sola vez: dos
 * pedidos simultáneos liberan una sola cama, porque la condición va dentro del
 * `updateMany` (lib/db/solicitudes.ts).
 */
export async function darDeAltaAlPaciente(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<Resultado<SolicitudConAlta>> {
  // Solo la ve el centro de destino: para cualquier otro, no existe (404).
  const solicitud = await obtenerSolicitudDelCentro(solicitudId, usuario.centroSaludId, "destino");
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  const internacion = {
    estado: solicitud.estado,
    tipoOcupado: solicitud.unidadOcupada?.tipo ?? null,
    fechaAlta: solicitud.fechaAlta,
  };
  if (impedimentoParaAlta(internacion) || !solicitud.unidadOcupadaId) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "Solo se le puede dar el alta a un paciente que llegó y sigue internado",
      { estadoActual: solicitud.estado },
    );
  }

  const conAlta = await liberarCama({ solicitudId, unidadOcupadaId: solicitud.unidadOcupadaId });
  if (!conAlta) {
    return rechazo("CAMBIO_CONCURRENTE", "La internación cambió mientras se procesaba");
  }

  return exito(conAlta);
}
