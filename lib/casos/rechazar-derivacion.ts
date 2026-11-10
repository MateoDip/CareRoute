import type { UsuarioConCentro } from "@/lib/auth";
import {
  obtenerSolicitudDelCentro,
  rechazarSolicitud,
} from "@/lib/db/solicitudes";
import {
  ladoQueRechaza,
  liberaCamaAlRechazar,
  rolesQuePuedenRechazar,
  transicionesPosibles,
} from "@/lib/reglas-solicitud";
import { unidadRequerida } from "@/lib/scoring-hospitales";
import { exito, rechazo, type Resultado } from "./resultado";

type SolicitudRechazada = NonNullable<
  Awaited<ReturnType<typeof rechazarSolicitud>>
>;

/**
 * Cancelar una derivación (regla 3 de la spec §6).
 *
 * Antes de la aprobación, cualquiera de los dos médicos puede hacerlo, cada uno
 * desde su lado. Una APROBADA ya no puede cancelarla el centro emisor: el
 * receptor reservó la cama. Si tenía cama reservada, se devuelve.
 */
export async function rechazarDerivacion(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<Resultado<SolicitudRechazada>> {
  // Cada médico solo ve su lado de la derivación.
  const lado = ladoQueRechaza(usuario.rol) ?? "origen";
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
    lado,
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  // Si nadie puede rechazarla, el rol no importa.
  const rolesHabilitados = rolesQuePuedenRechazar(solicitud.estado);
  if (rolesHabilitados.length === 0) {
    return rechazo(
      "ESTADO_INCOMPATIBLE",
      "La solicitud no puede rechazarse en este estado",
      {
        estadoActual: solicitud.estado,
        transicionesPosibles: transicionesPosibles(solicitud.estado),
      },
    );
  }

  // Regla de dominio sobre el rol: el usuario ya sabe que la solicitud existe
  // (es de su centro); lo que le falta es el permiso.
  if (!rolesHabilitados.includes(usuario.rol)) {
    return rechazo(
      "ROL_NO_HABILITADO",
      "Una solicitud aprobada solo puede rechazarla el centro receptor",
      { rolesHabilitados },
    );
  }

  const camaALiberar =
    liberaCamaAlRechazar(solicitud.estado) &&
    solicitud.centroDestinoId &&
    solicitud.evaluacionTriaje
      ? {
          centroSaludId: solicitud.centroDestinoId,
          tipo: unidadRequerida(solicitud.evaluacionTriaje.nivelUrgenciaSugerido),
        }
      : null;

  const rechazada = await rechazarSolicitud({
    solicitudId,
    estadoLeido: solicitud.estado,
    camaALiberar,
  });
  if (!rechazada) {
    return rechazo(
      "CAMBIO_CONCURRENTE",
      "La solicitud cambió de estado mientras se procesaba",
    );
  }

  return exito(rechazada);
}
