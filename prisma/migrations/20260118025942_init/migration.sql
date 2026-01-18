-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('MADRE', 'PADRE', 'TUTOR', 'FUNCIONARIO', 'TRABAJADOR_SOCIAL');

-- CreateEnum
CREATE TYPE "TipoSolicitud" AS ENUM ('TRABAJADOR', 'ESTUDIANTE', 'CASO_SOCIAL');

-- CreateEnum
CREATE TYPE "SectorPrioridad" AS ENUM ('SALUD', 'EDUCACION', 'DEFENSA', 'CASO_SOCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('RECIBIDA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'EN_ESPERA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CARNET', 'TARJETA_MENOR', 'CARTA_LABORAL', 'CARTA_ESTUDIO', 'INFORME_SOCIAL');

-- CreateEnum
CREATE TYPE "VinculoLaboral" AS ENUM ('ACTIVO', 'ESTUDIANTE', 'PERDIDO');

-- CreateEnum
CREATE TYPE "TipoCirculo" AS ENUM ('NORMAL', 'ESPECIAL', 'MIXTO');

-- CreateEnum
CREATE TYPE "ResultadoDecision" AS ENUM ('ACEPTADA', 'DENEGADA');

-- CreateEnum
CREATE TYPE "EstadoMatricula" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "tutor" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "carnetIdentidad" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipoPersona" "TipoPersona" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cantHijo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nino" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP NOT NULL,
    "sexo" TEXT NOT NULL,
    "tarjetaMenor" TEXT NOT NULL,
    "tutorId" UUID NOT NULL,
    "casoEspecial" BOOLEAN NOT NULL DEFAULT false,
    "tipoNecesidad" TEXT,

    CONSTRAINT "nino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circulo_infantil" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "capacidadTotal" INTEGER NOT NULL,
    "tipo" "TipoCirculo" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "circulo_infantil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo_otorgamiento" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP NOT NULL,
    "fechaCierre" TIMESTAMP NOT NULL,
    "fechaAsignacion" TIMESTAMP NOT NULL,

    CONSTRAINT "periodo_otorgamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacidad_circulo" (
    "id" UUID NOT NULL,
    "idCirculo" UUID NOT NULL,
    "idPeriodo" UUID NOT NULL,
    "cuposDisponibles" INTEGER NOT NULL,
    "cuposOcupados" INTEGER NOT NULL,

    CONSTRAINT "capacidad_circulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud" (
    "id" UUID NOT NULL,
    "ninoId" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "fechaSolicitud" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sector" "SectorPrioridad" NOT NULL,
    "tipoSolicitud" "TipoSolicitud" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL,
    "periodoId" UUID NOT NULL,
    "numeroRegistro" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_solicitud" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "fechaValidacion" TIMESTAMP,
    "validadorId" UUID,

    CONSTRAINT "documento_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comision" (
    "id" UUID NOT NULL,
    "municipio" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_comision" (
    "id" UUID NOT NULL,
    "comisionId" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "fecha" TIMESTAMP NOT NULL,
    "actaUrl" TEXT,

    CONSTRAINT "sesion_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_solicitud" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "sesionId" UUID NOT NULL,
    "resultado" "ResultadoDecision" NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "decision_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matricula" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "circuloId" UUID NOT NULL,
    "fechaOtorgamiento" TIMESTAMP NOT NULL,
    "fechaLimite" TIMESTAMP NOT NULL,
    "estado" "EstadoMatricula" NOT NULL,
    "boletaUrl" TEXT,

    CONSTRAINT "matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_trimestral" (
    "id" UUID NOT NULL,
    "matriculaId" UUID NOT NULL,
    "fecha" TIMESTAMP NOT NULL,
    "vinculo" "VinculoLaboral" NOT NULL,
    "observaciones" TEXT,
    "funcionarioId" UUID NOT NULL,

    CONSTRAINT "control_trimestral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trazabilidad" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,
    "comentario" TEXT,

    CONSTRAINT "trazabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_carnetIdentidad_key" ON "tutor"("carnetIdentidad");

-- CreateIndex
CREATE UNIQUE INDEX "nino_tarjetaMenor_key" ON "nino"("tarjetaMenor");

-- CreateIndex
CREATE UNIQUE INDEX "capacidad_circulo_idCirculo_idPeriodo_key" ON "capacidad_circulo"("idCirculo", "idPeriodo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_ninoId_key" ON "solicitud"("ninoId");

-- CreateIndex
CREATE UNIQUE INDEX "matricula_solicitudId_key" ON "matricula"("solicitudId");

-- AddForeignKey
ALTER TABLE "nino" ADD CONSTRAINT "nino_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad_circulo" ADD CONSTRAINT "capacidad_circulo_idCirculo_fkey" FOREIGN KEY ("idCirculo") REFERENCES "circulo_infantil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad_circulo" ADD CONSTRAINT "capacidad_circulo_idPeriodo_fkey" FOREIGN KEY ("idPeriodo") REFERENCES "periodo_otorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "nino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodo_otorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_solicitud" ADD CONSTRAINT "documento_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_solicitud" ADD CONSTRAINT "documento_solicitud_validadorId_fkey" FOREIGN KEY ("validadorId") REFERENCES "tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_comision" ADD CONSTRAINT "sesion_comision_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_comision" ADD CONSTRAINT "sesion_comision_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodo_otorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_solicitud" ADD CONSTRAINT "decision_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_solicitud" ADD CONSTRAINT "decision_solicitud_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesion_comision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "circulo_infantil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_trimestral" ADD CONSTRAINT "control_trimestral_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_trimestral" ADD CONSTRAINT "control_trimestral_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidad" ADD CONSTRAINT "trazabilidad_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidad" ADD CONSTRAINT "trazabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
