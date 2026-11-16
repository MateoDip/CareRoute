import type { UsuarioSesion } from "@/lib/auth";
import { existeCentro } from "@/lib/db/centros";
import { actualizarUsuario, obtenerUsuario } from "@/lib/db/usuarios";
import { impedimentoParaCambiarUsuario } from "@/lib/reglas-admin";
import type { ActualizarUsuario } from "@/lib/schemas/usuario";
import { exito, rechazo, type Resultado } from "./resultado";

type UsuarioAsignado = Awaited<ReturnType<typeof actualizarUsuario>>;

/**
 * El ADMIN asigna rol y centro a un usuario (spec §2, regla 4).
 *
 * Es la única forma de llegar a MEDICO_RECEPTOR o ADMIN, o de tener centro: el
 * registro con Google crea siempre MEDICO_DERIVANTE sin centro. Lo usan
 * PATCH /api/usuarios/:id y la pantalla /admin/usuarios/:id.
 */
export async function asignarUsuario(
  admin: UsuarioSesion,
  usuarioId: string,
  datos: ActualizarUsuario,
): Promise<Resultado<UsuarioAsignado>> {
  const usuario = await obtenerUsuario(usuarioId);
  if (!usuario) return rechazo("NO_ENCONTRADA", "El usuario no existe");

  // Un admin no se quita su propio rol: el sistema podría quedarse sin admin.
  if (
    impedimentoParaCambiarUsuario({
      adminId: admin.id,
      usuarioId,
      rolNuevo: datos.rol,
    }) === "AUTO_DEGRADACION"
  ) {
    return rechazo(
      "AUTO_DEGRADACION",
      "No podés quitarte el rol de administrador a vos mismo. Pedíselo a otro admin.",
    );
  }

  const { centroSaludId } = datos;
  if (centroSaludId && !(await existeCentro(centroSaludId))) {
    return rechazo("CENTRO_INEXISTENTE", "El centro de salud no existe");
  }

  return exito(await actualizarUsuario(usuarioId, datos));
}
