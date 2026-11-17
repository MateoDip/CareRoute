-- Regla 7 de docs/spec.md §6: cada derivación aprobada sabe qué cama ocupa el
-- paciente en el destino, para devolverla al rechazar, al dar el alta o al pasarlo
-- a otra unidad. Ver docs/adr/0012-la-derivacion-sabe-que-cama-ocupa.md.
--
-- Generada con `prisma migrate diff` y editada a mano para sumar el UPDATE del
-- final (las derivaciones que ya estaban aprobadas).

-- AlterEnum: los dos eventos nuevos de la bitácora (PostgreSQL 12 o más).
ALTER TYPE "EventoBitacora" ADD VALUE 'CAMBIO_DE_UNIDAD';
ALTER TYPE "EventoBitacora" ADD VALUE 'ALTA_DEL_PACIENTE';

-- AlterTable
ALTER TABLE "SolicitudTraslado" ADD COLUMN     "fechaAlta" TIMESTAMP(3),
ADD COLUMN     "unidadOcupadaId" TEXT;

-- CreateIndex
CREATE INDEX "SolicitudTraslado_unidadOcupadaId_idx" ON "SolicitudTraslado"("unidadOcupadaId");

-- CreateIndex: una unidad por tipo en cada centro. Nunca hubo forma de crear una
-- segunda (solo el seed crea unidades, una por tipo), así que no hay repetidas.
CREATE UNIQUE INDEX "UnidadCuidados_centroSaludId_tipo_key" ON "UnidadCuidados"("centroSaludId", "tipo");

-- AddForeignKey
ALTER TABLE "SolicitudTraslado" ADD CONSTRAINT "SolicitudTraslado_unidadOcupadaId_fkey" FOREIGN KEY ("unidadOcupadaId") REFERENCES "UnidadCuidados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las derivaciones que ya reservaron cama (APROBADA, EN_CURSO, FINALIZADA)
-- toman la unidad que les reservó la aprobación: la del tipo que pide su
-- triaje (lib/scoring-hospitales.ts, unidadRequerida) en el centro de destino.
-- Las FINALIZADA quedan internadas: el receptor les puede dar el alta.
UPDATE "SolicitudTraslado" AS s
SET "unidadOcupadaId" = u."id"
FROM "EvaluacionTriaje" AS e, "UnidadCuidados" AS u
WHERE e."solicitudId" = s."id"
  AND u."centroSaludId" = s."centroDestinoId"
  AND u."tipo" = (CASE e."nivelUrgenciaSugerido"
                    WHEN 'CRITICO' THEN 'UTI'
                    WHEN 'ALTO' THEN 'UTI'
                    WHEN 'MEDIO' THEN 'UCO'
                    ELSE 'SALA_COMUN'
                  END)::"TipoUnidad"
  AND s."estado" IN ('APROBADA', 'EN_CURSO', 'FINALIZADA');
