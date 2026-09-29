import type { RolUsuario } from "@prisma/client";
import { registrarUsuarioSiNoExiste } from "@/lib/db/usuarios";
import { crearClienteSupabase } from "@/lib/supabase-server";

/**
 * Autenticación y autorización (clase 6, ADR 0005 y 0006).
 *
 * Las funciones de este archivo son la ÚNICA forma válida de saber quién hace un
 * request. Nada se lee del body, de un header ni de la query: si el id o el rol
 * vinieran del cliente, cualquiera podría mentir.
 *
 *  - Supabase Auth (Google) prueba QUIÉN es la persona: devuelve su mail.
 *  - La tabla Usuario dice QUÉ puede hacer: rol y centro. Se lee en cada request,
 *    así un cambio de rol hecho por un admin rige sin volver a iniciar sesión.
 */

// El tipo sale de la base (@prisma/client), no de una lista escrita a mano.
export type Rol = RolUsuario;

/** Los roles del flujo clínico. El ADMIN configura el sistema, no deriva pacientes. */
export const ROLES_CLINICOS = [
  "MEDICO_DERIVANTE",
  "MEDICO_RECEPTOR",
] as const satisfies readonly Rol[];

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  centroSaludId: string | null;
};

export type UsuarioConCentro = UsuarioSesion & { centroSaludId: string };

/** No hay sesión → 401. */
export class NoAutenticado extends Error {
  constructor() {
    super("No autenticado");
    this.name = "NoAutenticado";
  }
}

/** Hay sesión, pero el rol no alcanza → 403. */
export class NoAutorizado extends Error {
  constructor(readonly rolesHabilitados: readonly Rol[]) {
    super("No podés realizar esta operación");
    this.name = "NoAutorizado";
  }
}

/** Hay sesión y rol, pero todavía no tiene centro asignado → 403. */
export class SinCentroAsignado extends Error {
  constructor() {
    super("Sin centro asignado");
    this.name = "SinCentroAsignado";
  }
}

/**
 * El usuario de la sesión, o null si no hay sesión.
 *
 * `getUser()` valida el token contra Supabase desde el servidor: no alcanza con
 * que el navegador "diga" que hay sesión.
 */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const supabase = await crearClienteSupabase();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;

  const nombreGoogle: unknown = data.user?.user_metadata?.full_name;
  const nombre =
    typeof nombreGoogle === "string" && nombreGoogle.trim() !== ""
      ? nombreGoogle
      : email;

  return registrarUsuarioSiNoExiste(email, nombre);
}

function normalizarRoles(roles?: Rol | readonly Rol[]): readonly Rol[] {
  if (!roles) return [];
  return typeof roles === "string" ? [roles] : roles;
}

/**
 * El usuario de la sesión, o corta el request lanzando NoAutenticado (401) o
 * NoAutorizado (403). Lo traduce `responderError` en el catch del handler.
 *
 * Es la primera línea del `try` de todo endpoint que no sea público.
 */
export async function requerirUsuario(
  roles?: Rol | readonly Rol[],
): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new NoAutenticado();

  const habilitados = normalizarRoles(roles);
  if (habilitados.length > 0 && !habilitados.includes(usuario.rol)) {
    throw new NoAutorizado(habilitados);
  }
  return usuario;
}

/**
 * Como `requerirUsuario`, pero además exige centro asignado: todo el flujo
 * clínico ocurre en nombre de un centro. Un usuario recién registrado todavía no
 * tiene: recibe 403 con un mensaje que le dice a quién pedírselo.
 */
export async function requerirUsuarioConCentro(
  roles?: Rol | readonly Rol[],
): Promise<UsuarioConCentro> {
  const usuario = await requerirUsuario(roles);
  const { centroSaludId } = usuario;
  if (!centroSaludId) throw new SinCentroAsignado();
  return { ...usuario, centroSaludId };
}
