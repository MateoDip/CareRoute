import type { RolUsuario } from "@prisma/client";

/**
 * Reglas de las operaciones del ADMIN (spec §2 y §3).
 *
 * Funciones puras: no importan Prisma ni Next, no leen la base, no miran el
 * reloj. Los datos llegan por parámetro y devuelven el motivo concreto.
 */

export type DependenciasCentro = {
  usuarios: number;
  solicitudes: number;
};

/**
 * Por qué no se puede dar de baja un centro, o null (spec §3, reglas de borrado).
 *
 * Usuario → CentroSalud y SolicitudTraslado → CentroSalud son `Restrict`: el
 * historial de derivaciones es inmutable y un médico no puede quedar colgado de
 * un centro que no existe. Unidades y recursos se borran en cascada: no cuentan.
 *
 * Devuelve las cantidades y no un booleano: el 409 le dice al admin qué tiene
 * que resolver antes (reasignar a N usuarios).
 */
export function impedimentoParaEliminarCentro(
  dependencias: DependenciasCentro,
): DependenciasCentro | null {
  if (dependencias.usuarios === 0 && dependencias.solicitudes === 0) {
    return null;
  }
  return dependencias;
}

/**
 * Por qué un admin no puede hacer este cambio sobre un usuario, o null.
 *
 * Un admin no puede quitarse a sí mismo el rol ADMIN: si es el único, el sistema
 * se queda sin nadie que pueda asignar roles y centros.
 */
export function impedimentoParaCambiarUsuario(params: {
  adminId: string;
  usuarioId: string;
  rolNuevo?: RolUsuario;
}): "AUTO_DEGRADACION" | null {
  const esElMismo = params.adminId === params.usuarioId;
  if (esElMismo && params.rolNuevo !== undefined && params.rolNuevo !== "ADMIN") {
    return "AUTO_DEGRADACION";
  }
  return null;
}
