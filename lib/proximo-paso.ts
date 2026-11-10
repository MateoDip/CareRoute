import type { EstadoSolicitud, RolUsuario } from "@prisma/client";
import { rolesQuePuedenRechazar } from "./reglas-solicitud";

export type ProximoPaso = {
  cargarTriaje: boolean;
  elegirDestino: boolean;
  aprobar: boolean;
  rechazar: boolean;
  /** Qué está pasando cuando no hay nada para hacer desde este lado. */
  aviso: string | null;
};

/**
 * Qué puede hacer este médico con esta solicitud ahora (spec §5 y §6).
 *
 * Decide qué botones muestra la ficha. Es experiencia de uso, no seguridad:
 * cada Server Action vuelve a verificar rol, lado y estado en su caso de uso.
 * Por eso usa las mismas reglas (rolesQuePuedenRechazar): un botón que se
 * muestra y después falla sería un error de diseño.
 */
export function proximoPaso(params: {
  rol: RolUsuario;
  estado: EstadoSolicitud;
  esOrigen: boolean;
  esDestino: boolean;
  tieneDestino: boolean;
}): ProximoPaso {
  const { rol, estado, esOrigen, esDestino, tieneDestino } = params;
  const derivante = rol === "MEDICO_DERIVANTE" && esOrigen;
  const receptor = rol === "MEDICO_RECEPTOR" && esDestino;

  const paso: ProximoPaso = {
    cargarTriaje: derivante && estado === "PENDIENTE",
    elegirDestino: derivante && estado === "EVALUANDO",
    aprobar: receptor && estado === "EVALUANDO",
    rechazar: (derivante || receptor) && rolesQuePuedenRechazar(estado).includes(rol),
    aviso: null,
  };

  if (estado === "RECHAZADA") paso.aviso = "La derivación fue rechazada. No hay nada pendiente.";
  else if (estado === "FINALIZADA") paso.aviso = "El traslado terminó. No hay nada pendiente.";
  else if (estado === "EN_CURSO") paso.aviso = "El traslado está en curso.";
  else if (derivante && estado === "EVALUANDO" && tieneDestino) {
    paso.aviso = "Esperando que el centro de destino la apruebe. Mientras tanto podés cambiar el destino.";
  } else if (derivante && estado === "APROBADA") {
    paso.aviso = "La aprobó el centro de destino. Desde ahora solo ese centro puede cancelarla.";
  } else if (receptor && estado === "APROBADA") {
    paso.aviso = "Aprobada: la cama está reservada. Si la rechazás, la cama vuelve a quedar libre.";
  } else if (!derivante && !receptor) {
    paso.aviso = "Desde tu rol no hay acciones para esta solicitud.";
  }

  return paso;
}
