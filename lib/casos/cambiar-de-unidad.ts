import type { TipoUnidad } from "@prisma/client";
import type { UsuarioConCentro } from "@/lib/auth";
import { listarUnidadesDelCentro } from "@/lib/db/centros";
import { cambiarDeUnidad, obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import { tiposConCamaLibre, unidadConCamaLibre } from "@/lib/disponibilidad";
import { ETIQUETA_UNIDAD } from "@/lib/formato";
import { impedimentoParaCambioDeUnidad } from "@/lib/reglas-internacion";
import { capacidadAgotada } from "./capacidad";
import { exito, rechazo, type Resultado } from "./resultado";

/**
 * Regla 7 — el receptor pasa al paciente internado a otra unidad de su centro
 * (por ejemplo, de UTI a sala común): libera la cama que ocupa y toma una del
 * tipo nuevo. Si no queda cama de ese tipo, no se mueve nada y el rechazo es el
 * mismo "Capacidad agotada" de HU04, con los tipos que sí tienen cama.
 */
export async function pasarAOtraUnidad(
  usuario: UsuarioConCentro,
  solicitudId: string,
  tipoNuevo: TipoUnidad,
): Promise<Resultado<{ tipoNuevo: TipoUnidad }>> {
  const solicitud = await obtenerSolicitudDelCentro(solicitudId, usuario.centroSaludId, "destino");
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  const tipoActual = solicitud.unidadOcupada?.tipo ?? null;
  const impedimento = impedimentoParaCambioDeUnidad(
    { estado: solicitud.estado, tipoOcupado: tipoActual, fechaAlta: solicitud.fechaAlta },
    tipoNuevo,
  );
  if (impedimento === "MISMA_UNIDAD") {
    return rechazo("MISMA_UNIDAD", "El paciente ya está internado en esa unidad");
  }
  if (impedimento || !solicitud.unidadOcupadaId || !tipoActual) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "Solo se puede pasar de unidad a un paciente que llegó y sigue internado",
      { estadoActual: solicitud.estado },
    );
  }

  const unidades = await listarUnidadesDelCentro(usuario.centroSaludId);
  const nueva = unidadConCamaLibre(unidades, tipoNuevo);
  if (!nueva) return capacidadAgotada(tipoNuevo, tiposConCamaLibre(unidades));

  const cambio = await cambiarDeUnidad({
    solicitudId,
    unidadActualId: solicitud.unidadOcupadaId,
    unidadNuevaId: nueva.id,
    observaciones: `De ${ETIQUETA_UNIDAD[tipoActual]} a ${ETIQUETA_UNIDAD[tipoNuevo]}`,
  });
  if (cambio.resultado === "SIN_CAMA") {
    // La última cama del tipo nuevo se ocupó entre la verificación y el pase.
    const actuales = await listarUnidadesDelCentro(usuario.centroSaludId);
    return capacidadAgotada(tipoNuevo, tiposConCamaLibre(actuales));
  }
  if (cambio.resultado === "ESTADO_CAMBIO") {
    return rechazo("CAMBIO_CONCURRENTE", "La internación cambió mientras se procesaba");
  }

  return exito({ tipoNuevo });
}
