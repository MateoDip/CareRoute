-- Regla 6 de docs/spec.md §6 (clase 14): un paciente no puede tener más de una
-- derivación abierta desde el mismo centro de origen. La cumple la base, no un
-- `if`: con diez pedidos simultáneos, el código solo aceptaba siete.
--
-- Generada con `prisma migrate dev --create-only` y editada a mano para sumar el
-- UPDATE del medio (las filas que ya existían).

-- AlterTable
ALTER TABLE "SolicitudTraslado" ADD COLUMN     "pacienteDniActivo" TEXT;

-- Las derivaciones abiertas que ya existen toman su DNI. Si un paciente ya tenía
-- más de una abierta en el mismo centro (datos de antes de la regla), solo la
-- más reciente lo toma: así el índice se puede crear sin borrar ni cerrar
-- ninguna fila (el historial no se toca). Las cerradas quedan en null.
UPDATE "SolicitudTraslado" AS s
SET "pacienteDniActivo" = s."pacienteDni"
FROM (
  SELECT DISTINCT ON ("centroOrigenId", "pacienteDni") "id"
  FROM "SolicitudTraslado"
  WHERE "estado" NOT IN ('RECHAZADA', 'FINALIZADA')
  ORDER BY "centroOrigenId", "pacienteDni", "fechaSolicitud" DESC
) AS abiertas
WHERE s."id" = abiertas."id";

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudTraslado_centroOrigenId_pacienteDniActivo_key" ON "SolicitudTraslado"("centroOrigenId", "pacienteDniActivo");
