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

type SolicitudEnCurso = NonNullable<
  Awaited<ReturnType<typeof avanzarTraslado>>
>;

/**
 * HU07, paso 6 del flujo — el derivante del centro de origen marca que el
 * paciente salió hacia el destino: la solicitud pasa de APROBADA a EN_CURSO y
 * queda "Paciente a bordo" en la bitácora.
 *
 * Lo marca el origen porque es el que ve salir al paciente (ADR 0011). Desde
 * EN_CURSO ya no se puede rechazar: el paciente está en la ambulancia.
 */
export async function iniciarTraslado(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<Resultado<SolicitudEnCurso>> {
  // Solo la ve el centro de origen: para cualquier otro, no existe (404).
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    "origen",
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  if (!puedeTransicionar(solicitud.estado, "EN_CURSO")) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "El traslado solo puede iniciarse cuando el destino aprobó la derivación",
      {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      },
    );
  }

  const enCurso = await avanzarTraslado({
    solicitudId,
    estadoLeido: solicitud.estado,
    nuevoEstado: "EN_CURSO",
    evento: "PACIENTE_A_BORDO",
  });
  if (!enCurso) {
    return rechazo(
      "CAMBIO_CONCURRENTE",
      "La solicitud cambió de estado mientras se procesaba",
    );
  }

  return exito(enCurso);
}
