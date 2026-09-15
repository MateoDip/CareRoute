import type { RolUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Sesion = {
  usuarioId: string;
  centroSaludId: string;
  rol: RolUsuario;
};

/**
 * TODO (clase 6): reemplazar por Supabase Auth.
 *
 * Implementación provisoria: la identidad llega en el header `x-usuario-email` y se
 * valida contra la tabla Usuario. Sirve para probar los endpoints con el archivo
 * docs/api.http antes de tener autenticación real.
 *
 * NO es seguro: cualquiera puede mandar el header que quiera. Por eso está marcado.
 * Lo que sí queda bien desde ahora es la forma de usarlo — la identidad se resuelve
 * en la frontera (el route handler) y se pasa hacia adentro como parámetro, nunca
 * se lee del body.
 */
export async function getSesion(request: Request): Promise<Sesion | null> {
  const email = request.headers.get("x-usuario-email");
  if (!email) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, rol: true, centroSaludId: true },
  });

  if (!usuario || usuario.centroSaludId === null) return null;

  return {
    usuarioId: usuario.id,
    centroSaludId: usuario.centroSaludId,
    rol: usuario.rol,
  };
}
