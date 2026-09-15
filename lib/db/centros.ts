import type { NivelUrgencia, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActualizarUnidad } from "@/lib/schemas/unidad-cuidados";
import {
  calcularPuntaje,
  unidadRequerida,
  type CentroCandidato,
} from "@/lib/scoring-hospitales";

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

/**
 * Ranking de centros candidatos para una derivación (HU03).
 *
 * Solo entran los que tienen al menos una cama libre del tipo que requiere la
 * urgencia del paciente, y se excluye el centro de origen. El orden lo define
 * `calcularPuntaje`, que vive en lib/scoring-hospitales.ts.
 */
export async function buscarCandidatos(params: {
  urgencia: NivelUrgencia;
  centroOrigenId: string;
}) {
  const tipoRequerido = unidadRequerida(params.urgencia);

  const centros = await prisma.centroSalud.findMany({
    where: {
      id: { not: params.centroOrigenId },
      unidadesCuidados: {
        some: { tipo: tipoRequerido, camasDisponibles: { gt: 0 } },
      },
    },
    select: {
      ...camposCentro,
      unidadesCuidados: {
        where: { tipo: tipoRequerido },
        select: { camasDisponibles: true },
      },
      recursosEspecializados: {
        where: { estado: "OPERATIVO" },
        select: { id: true },
      },
    },
    take: LIMITE_LISTADO,
  });

  const candidatos: Array<CentroCandidato & { puntaje: number }> = centros.map(
    (centro) => {
      const candidato: CentroCandidato = {
        id: centro.id,
        nombre: centro.nombre,
        ubicacion: centro.ubicacion,
        nivelComplejidad: centro.nivelComplejidad,
        camasDisponibles: centro.unidadesCuidados.reduce(
          (total, unidad) => total + unidad.camasDisponibles,
          0,
        ),
        recursosOperativos: centro.recursosEspecializados.length,
      };

      return { ...candidato, puntaje: calcularPuntaje(candidato) };
    },
  );

  return {
    tipoUnidadRequerida: tipoRequerido,
    candidatos: candidatos.sort((a, b) => b.puntaje - a.puntaje),
  };
}
