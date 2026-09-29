-- Correcciones del modelo (clases 3 y 6) + Row Level Security.
--
-- Escrita a partir de `prisma migrate diff` y ajustada a mano en dos puntos,
-- porque la base ya tiene filas:
--   1. `actualizadaEn` es NOT NULL sin default (@updatedAt). Agregarla así falla
--      con filas existentes: se agrega con default y después se le saca.
--   2. La N-N de tripulaciones: se crea la tabla intermedia y se copian las
--      asignaciones existentes ANTES de borrar la columna vieja.

-- CreateEnum
CREATE TYPE "OrigenNivelUrgencia" AS ENUM ('IA', 'MANUAL');

-- Timestamps
ALTER TABLE "Usuario"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CentroSalud"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "UnidadCuidados"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RecursoEspecializado"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- H3: fecha y hora de la decisión.
ALTER TABLE "SolicitudTraslado"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "fechaAprobacion" TIMESTAMP(3);

-- Las evaluaciones anteriores a la clase 7 las cargó el médico: MANUAL.
ALTER TABLE "EvaluacionTriaje"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "origenNivel" "OrigenNivelUrgencia" NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "TripulacionMedica"
  ADD COLUMN "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RegistroBitacora"
  ADD COLUMN "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- @updatedAt lo completa Prisma, no la base: se saca el default transitorio.
ALTER TABLE "Usuario" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "CentroSalud" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "UnidadCuidados" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "RecursoEspecializado" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "SolicitudTraslado" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "EvaluacionTriaje" ALTER COLUMN "actualizadaEn" DROP DEFAULT;
ALTER TABLE "TripulacionMedica" ALTER COLUMN "actualizadaEn" DROP DEFAULT;

-- N-N SolicitudTraslado <-> TripulacionMedica
CREATE TABLE "AsignacionTripulacion" (
    "asignadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "solicitudId" TEXT NOT NULL,
    "tripulacionMedicaId" TEXT NOT NULL,

    CONSTRAINT "AsignacionTripulacion_pkey" PRIMARY KEY ("solicitudId","tripulacionMedicaId")
);

-- Las asignaciones 1-N que ya existían pasan a la tabla intermedia.
INSERT INTO "AsignacionTripulacion" ("solicitudId", "tripulacionMedicaId")
SELECT "solicitudId", "id" FROM "TripulacionMedica";

CREATE INDEX "AsignacionTripulacion_tripulacionMedicaId_idx" ON "AsignacionTripulacion"("tripulacionMedicaId");

ALTER TABLE "AsignacionTripulacion" ADD CONSTRAINT "AsignacionTripulacion_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudTraslado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AsignacionTripulacion" ADD CONSTRAINT "AsignacionTripulacion_tripulacionMedicaId_fkey" FOREIGN KEY ("tripulacionMedicaId") REFERENCES "TripulacionMedica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recién ahora se borra la columna vieja.
ALTER TABLE "TripulacionMedica" DROP CONSTRAINT "TripulacionMedica_solicitudId_fkey";
DROP INDEX "TripulacionMedica_solicitudId_idx";
ALTER TABLE "TripulacionMedica" DROP COLUMN "solicitudId";

-- Row Level Security (ADR 0007).
-- Supabase publica el schema `public` por su API REST, y la anon key viaja al
-- navegador. Sin RLS, cualquiera con esa clave lee las tablas (DNI incluidos).
-- RLS activado y SIN políticas = la API REST de Supabase no ve ninguna fila.
-- Prisma se conecta con el rol dueño de las tablas, que no está sujeto a RLS:
-- la app sigue funcionando y la autorización vive en lib/db/ (clase 6).
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CentroSalud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UnidadCuidados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecursoEspecializado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SolicitudTraslado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluacionTriaje" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TripulacionMedica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AsignacionTripulacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegistroBitacora" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
