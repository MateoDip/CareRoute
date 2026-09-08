-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'MEDICO_DERIVANTE', 'MEDICO_RECEPTOR');

-- CreateEnum
CREATE TYPE "NivelComplejidad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoUnidad" AS ENUM ('UTI', 'UCO', 'SALA_COMUN', 'GUARDIA');

-- CreateEnum
CREATE TYPE "TipoRecurso" AS ENUM ('RESPIRADOR', 'MONITOR_MULTIPARAMETRICO', 'DESFIBRILADOR', 'BOMBA_INFUSION');

-- CreateEnum
CREATE TYPE "EstadoRecurso" AS ENUM ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'EVALUANDO', 'APROBADA', 'RECHAZADA', 'EN_CURSO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "NivelUrgencia" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "EstadoTripulacion" AS ENUM ('EN_BASE', 'EN_TRANSITO_ORIGEN', 'EN_TRANSITO_DESTINO', 'REGRESANDO');

-- CreateEnum
CREATE TYPE "EventoBitacora" AS ENUM ('SALIDA_BASE', 'LLEGADA_ORIGEN', 'PACIENTE_A_BORDO', 'LLEGADA_DESTINO', 'COMPLICACION_CLINICA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "centroSaludId" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroSalud" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelComplejidad" "NivelComplejidad" NOT NULL,
    "ubicacion" TEXT NOT NULL,

    CONSTRAINT "CentroSalud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadCuidados" (
    "id" TEXT NOT NULL,
    "centroSaludId" TEXT NOT NULL,
    "tipo" "TipoUnidad" NOT NULL,
    "camasDisponibles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UnidadCuidados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecursoEspecializado" (
    "id" TEXT NOT NULL,
    "centroSaludId" TEXT NOT NULL,
    "tipo" "TipoRecurso" NOT NULL,
    "estado" "EstadoRecurso" NOT NULL,
    "ultimaRevision" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecursoEspecializado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudTraslado" (
    "id" TEXT NOT NULL,
    "centroOrigenId" TEXT NOT NULL,
    "centroDestinoId" TEXT,
    "pacienteDni" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudTraslado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionTriaje" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "frecuenciaCardiaca" INTEGER NOT NULL,
    "presionSistolica" INTEGER NOT NULL,
    "presionDiastolica" INTEGER NOT NULL,
    "nivelUrgenciaSugerido" "NivelUrgencia" NOT NULL,

    CONSTRAINT "EvaluacionTriaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripulacionMedica" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "patenteAmbulancia" TEXT NOT NULL,
    "paramedicoResponsable" TEXT NOT NULL,
    "estado" "EstadoTripulacion" NOT NULL,

    CONSTRAINT "TripulacionMedica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroBitacora" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "tripulacionMedicaId" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evento" "EventoBitacora" NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "RegistroBitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_centroSaludId_idx" ON "Usuario"("centroSaludId");

-- CreateIndex
CREATE INDEX "UnidadCuidados_centroSaludId_idx" ON "UnidadCuidados"("centroSaludId");

-- CreateIndex
CREATE INDEX "RecursoEspecializado_centroSaludId_idx" ON "RecursoEspecializado"("centroSaludId");

-- CreateIndex
CREATE INDEX "SolicitudTraslado_centroOrigenId_idx" ON "SolicitudTraslado"("centroOrigenId");

-- CreateIndex
CREATE INDEX "SolicitudTraslado_centroDestinoId_idx" ON "SolicitudTraslado"("centroDestinoId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionTriaje_solicitudId_key" ON "EvaluacionTriaje"("solicitudId");

-- CreateIndex
CREATE INDEX "TripulacionMedica_solicitudId_idx" ON "TripulacionMedica"("solicitudId");

-- CreateIndex
CREATE INDEX "RegistroBitacora_solicitudId_idx" ON "RegistroBitacora"("solicitudId");

-- CreateIndex
CREATE INDEX "RegistroBitacora_tripulacionMedicaId_idx" ON "RegistroBitacora"("tripulacionMedicaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_centroSaludId_fkey" FOREIGN KEY ("centroSaludId") REFERENCES "CentroSalud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadCuidados" ADD CONSTRAINT "UnidadCuidados_centroSaludId_fkey" FOREIGN KEY ("centroSaludId") REFERENCES "CentroSalud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoEspecializado" ADD CONSTRAINT "RecursoEspecializado_centroSaludId_fkey" FOREIGN KEY ("centroSaludId") REFERENCES "CentroSalud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraslado" ADD CONSTRAINT "SolicitudTraslado_centroOrigenId_fkey" FOREIGN KEY ("centroOrigenId") REFERENCES "CentroSalud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTraslado" ADD CONSTRAINT "SolicitudTraslado_centroDestinoId_fkey" FOREIGN KEY ("centroDestinoId") REFERENCES "CentroSalud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionTriaje" ADD CONSTRAINT "EvaluacionTriaje_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudTraslado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripulacionMedica" ADD CONSTRAINT "TripulacionMedica_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudTraslado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroBitacora" ADD CONSTRAINT "RegistroBitacora_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudTraslado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroBitacora" ADD CONSTRAINT "RegistroBitacora_tripulacionMedicaId_fkey" FOREIGN KEY ("tripulacionMedicaId") REFERENCES "TripulacionMedica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
