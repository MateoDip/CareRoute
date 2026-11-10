import type { TipoUnidad } from "@prisma/client";
import type { UsuarioConCentro } from "@/lib/auth";
import { listarCentrosConUnidades } from "@/lib/db/centros";
import { obtenerSolicitudDelCentro } from "@/lib/db/solicitudes";
import {
  rankearCandidatos,
  unidadRequerida,
} from "@/lib/scoring-hospitales";
import { exito, rechazo, type Resultado } from "./resultado";

export type RankingDestinos = {
  tipoUnidadRequerida: TipoUnidad;
  candidatos: ReturnType<typeof rankearCandidatos>;
};

/**
 * HU03 — los centros a los que se puede derivar, ordenados por puntaje.
 *
 * Los criterios salen de la solicitud, no de quien pregunta: el tipo de cama
 * depende de su triaje y el centro de origen se excluye. Lo usan la API
 * (GET /candidatos) y la pantalla de elegir destino.
 */
export async function rankingDeDestinos(
  usuario: UsuarioConCentro,
  solicitudId: string,
): Promise<Resultado<RankingDestinos>> {
  const solicitud = await obtenerSolicitudDelCentro(
    solicitudId,
    usuario.centroSaludId,
  );
  if (!solicitud) return rechazo("NO_ENCONTRADA", "La solicitud no existe");

  // Sin triaje no hay nivel de urgencia ni tipo de cama a buscar.
  if (!solicitud.evaluacionTriaje) {
    return rechazo("FALTA_TRIAJE", "Falta la evaluación de triaje", {
      estadoActual: solicitud.estado,
    });
  }

  const tipoUnidadRequerida = unidadRequerida(
    solicitud.evaluacionTriaje.nivelUrgenciaSugerido,
  );
  const centros = await listarCentrosConUnidades();
  const candidatos = rankearCandidatos(
    centros,
    tipoUnidadRequerida,
    solicitud.centroOrigenId,
  );

  return exito({ tipoUnidadRequerida, candidatos });
}
