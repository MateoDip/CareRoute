import type { TipoUnidad } from "@prisma/client";
import type { UsuarioConCentro } from "@/lib/auth";
import { listarUnidadesDelCentro } from "@/lib/db/centros";
import {
  aprobarSolicitud,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import { tiposConCamaLibre, unidadConCamaLibre } from "@/lib/disponibilidad";
import { impedimentoParaAprobar } from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";
import { capacidadAgotada } from "./capacidad";
import { exito, rechazo, type Resultado } from "./resultado";

type Aprobacion = Extract<
  Awaited<ReturnType<typeof aprobarSolicitud>>,
  { resultado: "APROBADA" }
>;

/**
 * HU04, paso 5 del flujo — el receptor del centro elegido confirma: se reserva la
 * cama, la solicitud pasa a APROBADA y queda la fecha y hora de la decisión.
 *
 * Nada de lo que mande el cliente cambia a qué centro se deriva: el destino ya
 * está en la solicitud y el centro del receptor sale de su sesión.
 */
export async function aprobarDerivacion(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<
  Resultado<{ solicitud: Aprobacion["solicitud"]; unidadReservada: TipoUnidad }>
> {
  // Solo la ve el centro elegido como destino.
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    "destino",
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  const impedimento = impedimentoParaAprobar({
    estado: solicitud.estado,
    centroOrigenId: solicitud.centroOrigenId,
    centroDestinoId: usuario.centroSaludId,
  });
  if (impedimento?.motivo === "ESTADO_INCOMPATIBLE") {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "La solicitud no puede aprobarse en este estado",
      {
        estadoActual: impedimento.estadoActual,
        transicionesPosibles: impedimento.transicionesPosibles,
      },
    );
  }
  if (impedimento?.motivo === "DESTINO_IGUAL_A_ORIGEN") {
    return rechazo(
      "DESTINO_IGUAL_A_ORIGEN",
      "El centro de destino no puede ser el de origen",
    );
  }
  if (!solicitud.evaluacionTriaje) {
    return rechazo("FALTA_TRIAJE", "Falta la evaluación de triaje", {
      estadoActual: solicitud.estado,
    });
  }

  const tipoRequerido = unidadRequerida(
    solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
  );
  const unidades = await listarUnidadesDelCentro(usuario.centroSaludId);
  const unidad = unidadConCamaLibre(unidades, tipoRequerido);
  if (!unidad) {
    return capacidadAgotada(tipoRequerido, tiposConCamaLibre(unidades));
  }

  // Reserva de cama y cambio de estado, todo o nada.
  const aprobacion = await aprobarSolicitud({
    solicitudId,
    centroDestinoId: usuario.centroSaludId,
    unidadId: unidad.id,
  });

  if (aprobacion.resultado === "SIN_CAMA") {
    // La última cama se ocupó entre la verificación y la reserva (HU04).
    const actuales = await listarUnidadesDelCentro(usuario.centroSaludId);
    return capacidadAgotada(tipoRequerido, tiposConCamaLibre(actuales));
  }
  if (aprobacion.resultado === "ESTADO_CAMBIO") {
    return rechazo(
      "CAMBIO_CONCURRENTE",
      "La solicitud cambió de estado mientras se procesaba",
    );
  }

  return exito({ solicitud: aprobacion.solicitud, unidadReservada: unidad.tipo });
}
