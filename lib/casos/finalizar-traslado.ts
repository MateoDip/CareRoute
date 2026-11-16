import type { UsuarioConCentro } from "@/lib/auth";
import {
  avanzarTraslado,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import {
  puedeTransicionar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import { exito, rechazo, type Resultado } from "./resultado";

type SolicitudFinalizada = NonNullable<
  Awaited<ReturnType<typeof avanzarTraslado>>
>;

/**
 * HU07, cierre del flujo — el receptor del centro de destino marca que el
 * paciente llegó: la solicitud pasa de EN_CURSO a FINALIZADA y queda "Llegada
 * al destino" en la bitácora.
 *
 * Lo marca el destino porque es el que recibe al paciente (ADR 0011). Al
 * finalizar se cierra la derivación (regla 6): el paciente se puede volver a
 * derivar desde su centro.
 */
export async function finalizarTraslado(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<Resultado<SolicitudFinalizada>> {
  // Solo la ve el centro de destino: para cualquier otro, no existe (404).
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    "destino",
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  if (!puedeTransicionar(solicitud.estado, "FINALIZADA")) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "El traslado solo puede finalizarse si está en curso",
      {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      },
    );
  }

  const finalizada = await avanzarTraslado({
    solicitudId,
    estadoLeido: solicitud.estado,
    nuevoEstado: "FINALIZADA",
    evento: "LLEGADA_DESTINO",
  });
  if (!finalizada) {
    return rechazo(
      "CAMBIO_CONCURRENTE",
      "La solicitud cambió de estado mientras se procesaba",
    );
  }

  return exito(finalizada);
}
