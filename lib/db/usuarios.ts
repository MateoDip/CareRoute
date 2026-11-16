import type { Prisma, RolUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const LIMITE_LISTADO = 50;

const camposUsuario = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  centroSaludId: true,
} satisfies Prisma.UsuarioSelect;

/**
 * El usuario de la sesión, creándolo en su primer login (clase 6, ADR 0005).
 *
 * `update: {}` no pisa nada si ya existe: el rol y el centro que le asignó un
 * admin se conservan. `create` le da SIEMPRE el rol de menor privilegio y ningún
 * centro: nadie puede auto-registrarse como receptor o admin.
 */
export async function registrarUsuarioSiNoExiste(email: string, nombre: string) {
  return prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, nombre, rol: "MEDICO_DERIVANTE" },
    select: camposUsuario,
  });
}

/** Solo lo usa el ADMIN: no filtra por centro a propósito (ver matriz en api.md). */
export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: {
      ...camposUsuario,
      centroSalud: { select: { nombre: true } },
    },
    orderBy: { email: "asc" },
    take: LIMITE_LISTADO,
  });
}

export async function obtenerUsuario(id: string) {
  return prisma.usuario.findUnique({ where: { id }, select: camposUsuario });
}

export async function actualizarUsuario(
  id: string,
  datos: { rol?: RolUsuario; centroSaludId?: string | null },
) {
  return prisma.usuario.update({
    where: { id },
    data: datos,
    select: camposUsuario,
  });
}

/**
 * Para el resumen del panel del ADMIN: quiénes entraron con Google y todavía no
 * pueden operar (médicos sin centro, regla 4), los más recientes primero, y los
 * totales por rol. Sin datos clínicos: el admin no los ve (docs/api.md).
 */
export async function resumenDeUsuarios() {
  const [sinCentro, porRol] = await Promise.all([
    prisma.usuario.findMany({
      where: { centroSaludId: null, rol: { not: "ADMIN" } },
      select: camposUsuario,
      orderBy: { creadaEn: "desc" },
      take: LIMITE_LISTADO,
    }),
    prisma.usuario.groupBy({ by: ["rol"], _count: { _all: true } }),
  ]);

  const totales: Record<RolUsuario, number> = {
    ADMIN: 0,
    MEDICO_DERIVANTE: 0,
    MEDICO_RECEPTOR: 0,
  };
  for (const fila of porRol) totales[fila.rol] = fila._count._all;

  return { sinCentro, totales };
}
