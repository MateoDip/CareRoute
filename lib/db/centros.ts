import type { Prisma } from "@prisma/client";
import type { UnidadDisponible } from "@/lib/disponibilidad";
import { prisma } from "@/lib/prisma";
import type { ActualizarUnidad } from "@/lib/schemas/unidad-cuidados";
import type { CentroConUnidades } from "@/lib/scoring-hospitales";

const LIMITE_LISTADO = 50;

const camposCentro = {
  id: true,
  nombre: true,
  ubicacion: true,
  nivelComplejidad: true,
} satisfies Prisma.CentroSaludSelect;

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
    select: camposCentro,
  });
}

export async function obtenerUnidad(id: string) {
  return prisma.unidadCuidados.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      camasDisponibles: true,
      centroSaludId: true,
    },
  });
}

export async function actualizarUnidad(id: string, datos: ActualizarUnidad) {
  return prisma.unidadCuidados.update({
    where: { id },
    data: datos,
    select: {
      id: true,
      tipo: true,
      camasDisponibles: true,
      centroSaludId: true,
    },
  });
}

/** Las unidades de un centro con sus camas libres: el insumo de la regla de H3. */
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
