import { Prisma, type RolUsuario } from "@prisma/client";
import type { DependenciasCentro } from "@/lib/reglas-admin";
import type { UnidadDisponible } from "@/lib/disponibilidad";
import { prisma } from "@/lib/prisma";
import type {
  ActualizarCentro,
  CrearCentro,
} from "@/lib/schemas/centro-salud";
import type { ActualizarUnidad } from "@/lib/schemas/unidad-cuidados";
import type { CentroConUnidades } from "@/lib/scoring-hospitales";

const LIMITE_LISTADO = 50;

const camposCentro = {
  id: true,
  nombre: true,
  ubicacion: true,
  nivelComplejidad: true,
} satisfies Prisma.CentroSaludSelect;

const camposUnidad = {
  id: true,
  tipo: true,
  camasDisponibles: true,
  centroSaludId: true,
} satisfies Prisma.UnidadCuidadosSelect;

// ---------------------------------------------------------------------------
// CentroSalud — CRUD completo (el ADMIN da de alta, edita y da de baja)
// ---------------------------------------------------------------------------

/** Catálogo: lo ve cualquier usuario logueado (HU05 y ranking). */
export async function listarCentros() {
  return prisma.centroSalud.findMany({
    select: {
      ...camposCentro,
      unidadesCuidados: {
        select: { id: true, tipo: true, camasDisponibles: true },
      },
      recursosEspecializados: {
        select: { id: true, tipo: true, estado: true },
      },
    },
    orderBy: { nombre: "asc" },
    take: LIMITE_LISTADO,
  });
}

export async function obtenerCentro(id: string) {
  return prisma.centroSalud.findUnique({
    where: { id },
    select: {
      ...camposCentro,
      unidadesCuidados: {
        select: { id: true, tipo: true, camasDisponibles: true },
      },
      recursosEspecializados: {
        select: { id: true, tipo: true, estado: true },
      },
    },
  });
}

export async function existeCentro(id: string): Promise<boolean> {
  const centro = await prisma.centroSalud.findUnique({
    where: { id },
    select: { id: true },
  });
  return centro !== null;
}

export async function crearCentro(datos: CrearCentro) {
  return prisma.centroSalud.create({ data: datos, select: camposCentro });
}

/** null si no existe. */
export async function actualizarCentro(id: string, datos: ActualizarCentro) {
  const { count } = await prisma.centroSalud.updateMany({
    where: { id },
    data: datos,
  });
  if (count === 0) return null;
  return prisma.centroSalud.findUnique({ where: { id }, select: camposCentro });
}

/**
 * Lo que impide borrar un centro (Restrict en el schema): usuarios y
 * solicitudes, como origen o como destino. null si el centro no existe.
 */
export async function contarDependenciasDelCentro(
  id: string,
): Promise<DependenciasCentro | null> {
  const centro = await prisma.centroSalud.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          usuarios: true,
          solicitudesOrigen: true,
          solicitudesDestino: true,
        },
      },
    },
  });
  if (!centro) return null;

  return {
    usuarios: centro._count.usuarios,
    solicitudes:
      centro._count.solicitudesOrigen + centro._count.solicitudesDestino,
  };
}

/**
 * Borra el centro; sus unidades y recursos caen en cascada (onDelete: Cascade).
 *
 * Devuelve false si entre el conteo y el borrado alguien le vinculó un usuario o
 * una solicitud: la base lo frena con el Restrict (P2003) y eso es un resultado
 * esperado, no una excepción.
 */
export async function eliminarCentro(id: string): Promise<boolean> {
  try {
    await prisma.centroSalud.delete({ where: { id } });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025")
    ) {
      return false;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// UnidadCuidados
// ---------------------------------------------------------------------------

/**
 * La unidad, solo si el usuario puede editarla (HU05). La pertenencia va en el
 * `where` (clase 6): el receptor solo ve las de su centro; el ADMIN, todas.
 * null → 404, tanto si no existe como si es de otro centro.
 */
export async function obtenerUnidadEditable(
  id: string,
  usuario: { rol: RolUsuario; centroSaludId: string | null },
) {
  if (usuario.rol !== "ADMIN" && !usuario.centroSaludId) return null;

  return prisma.unidadCuidados.findFirst({
    where:
      usuario.rol === "ADMIN"
        ? { id }
        : { id, centroSaludId: usuario.centroSaludId ?? undefined },
    select: camposUnidad,
  });
}

export async function actualizarUnidad(id: string, datos: ActualizarUnidad) {
  return prisma.unidadCuidados.update({
    where: { id },
    data: datos,
    select: camposUnidad,
  });
}

/** Las unidades de un centro con sus camas libres: el insumo de la regla de HU04. */
export async function listarUnidadesDelCentro(
  centroSaludId: string,
): Promise<UnidadDisponible[]> {
  return prisma.unidadCuidados.findMany({
    where: { centroSaludId },
    select: { id: true, tipo: true, camasDisponibles: true },
  });
}

/**
 * Centros con sus unidades y la cantidad de recursos operativos (HU03).
 *
 * Solo trae datos: qué centros son elegibles y en qué orden lo decide
 * `rankearCandidatos`, en lib/scoring-hospitales.ts.
 */
export async function listarCentrosConUnidades(): Promise<CentroConUnidades[]> {
  const centros = await prisma.centroSalud.findMany({
    select: {
      ...camposCentro,
      unidadesCuidados: {
        select: { id: true, tipo: true, camasDisponibles: true },
      },
      recursosEspecializados: {
        where: { estado: "OPERATIVO" },
        select: { id: true },
      },
    },
    take: LIMITE_LISTADO,
  });

  return centros.map((centro) => ({
    id: centro.id,
    nombre: centro.nombre,
    ubicacion: centro.ubicacion,
    nivelComplejidad: centro.nivelComplejidad,
    unidades: centro.unidadesCuidados,
    recursosOperativos: centro.recursosEspecializados.length,
  }));
}
