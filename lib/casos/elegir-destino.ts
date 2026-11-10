import type { UsuarioConCentro } from "@/lib/auth";
import { existeCentro, listarUnidadesDelCentro } from "@/lib/db/centros";
import {
  asignarDestino,
  obtenerSolicitudDelCentro,
} from "@/lib/db/solicitudes";
import { tiposConCamaLibre, unidadConCamaLibre } from "@/lib/disponibilidad";
import { impedimentoParaAsignarDestino } from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";
import { capacidadAgotada } from "./capacidad";
import { exito, rechazo, type Resultado } from "./resultado";

type SolicitudConDestino = NonNullable<Awaited<ReturnType<typeof asignarDestino>>>;

/**
 * HU04, paso 4 del flujo — el médico derivante elige del ranking el centro al que
 * quiere derivar.
 *
 * Todavía no reserva cama: eso lo hace la aprobación del receptor. Acá se
 * verifica que el destino tenga cama del tipo requerido en este momento. Mientras
 * nadie apruebe, el derivante puede cambiar de destino.
 */
export async function elegirDestino(
  usuario: UsuarioConCentro,
  solicitudId: string,
  centroDestinoId: string,
): Promise<Resultado<SolicitudConDestino>> {
  // Elige destino el centro de origen.
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    "origen",
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  const impedimento = impedimentoParaAsignarDestino({
    estado: solicitud.estado,
    centroOrigenId: solicitud.centroOrigenId,
    centroDestinoId,
  });
  if (impedimento?.motivo === "ESTADO_INCOMPATIBLE") {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "Solo se puede elegir destino con el triaje hecho y antes de la aprobación",
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

  if (!(await existeCentro(centroDestinoId))) {
    return rechazo("CENTRO_INEXISTENTE", "El centro de destino no existe");
  }

  const tipoRequerido = unidadRequerida(
    solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
  );
  const unidades = await listarUnidadesDelCentro(centroDestinoId);
  if (!unidadConCamaLibre(unidades, tipoRequerido)) {
    return capacidadAgotada(tipoRequerido, tiposConCamaLibre(unidades));
  }

  // null: la aprobaron o rechazaron entre la lectura y acá.
  const actualizada = await asignarDestino({
    solicitudId,
    centroOrigenId: usuario.centroSaludId,
    centroDestinoId,
  });
  if (!actualizada) {
    return rechazo(
      "CAMBIO_CONCURRENTE",
      "La solicitud cambió de estado mientras se procesaba",
    );
  }

  return exito(actualizada);
}
