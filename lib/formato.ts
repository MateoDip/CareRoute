import type {
  EstadoSolicitud,
  EstadoTripulacion,
  EventoBitacora,
  NivelUrgencia,
  RolUsuario,
} from "@prisma/client";

/**
 * Cómo se muestran los datos en pantalla. Se usa en el servidor, antes de pasar
 * props a un componente de cliente: las props tienen que ser serializables, así
 * que las fechas viajan ya formateadas como texto (clase 8).
 *
 * Los Record obligan a etiquetar cada valor: si se agrega un estado al enum de
 * Prisma, el typecheck falla hasta que alguien decida cómo se llama en pantalla.
 */

/**
 * Vercel corre en UTC. Sin zona horaria explícita, una derivación creada a las
 * 20:30 en Rosario se mostraría como 23:30.
 */
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/**
 * "9/11/26, 20:30". Reloj de 24 h a propósito: según la versión de ICU, es-AR
 * puede salir como "8:30 p. m.", y en una guardia la hora no se interpreta.
 */
export function formatearFechaHora(fecha: Date): string {
  return fecha.toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    dateStyle: "short",
    timeStyle: "short",
    hourCycle: "h23",
  });
}

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  MEDICO_DERIVANTE: "Médico derivante",
  MEDICO_RECEPTOR: "Médico receptor",
};

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  EVALUANDO: "Evaluando",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  EN_CURSO: "En curso",
  FINALIZADA: "Finalizada",
};

export const ETIQUETA_NIVEL: Record<NivelUrgencia, string> = {
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Crítico",
};

export const ETIQUETA_TRIPULACION: Record<EstadoTripulacion, string> = {
  EN_BASE: "En base",
  EN_TRANSITO_ORIGEN: "En camino al origen",
  EN_TRANSITO_DESTINO: "En camino al destino",
  REGRESANDO: "Regresando",
};

export const ETIQUETA_EVENTO: Record<EventoBitacora, string> = {
  SALIDA_BASE: "Salió de la base",
  LLEGADA_ORIGEN: "Llegó al centro de origen",
  PACIENTE_A_BORDO: "Paciente a bordo",
  LLEGADA_DESTINO: "Llegó al centro de destino",
  COMPLICACION_CLINICA: "Complicación clínica",
};
