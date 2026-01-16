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
CREATE TABLE "Tutor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "carnetIdentidad" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipoPersona" "TipoPersona" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cantHijo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nino" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL,
    "tarjetaMenor" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "casoEspecial" BOOLEAN NOT NULL DEFAULT false,
    "tipoNecesidad" TEXT,

    CONSTRAINT "Nino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirculoInfantil" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "capacidadTotal" INTEGER NOT NULL,
    "tipo" "TipoCirculo" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CirculoInfantil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodoOtorgamiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoOtorgamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacidadCirculo" (
    "id" TEXT NOT NULL,
    "idCirculo" TEXT NOT NULL,
    "idPeriodo" TEXT NOT NULL,
    "cuposDisponibles" INTEGER NOT NULL,
    "cuposOcupados" INTEGER NOT NULL,

    CONSTRAINT "CapacidadCirculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" TEXT NOT NULL,
    "ninoId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sector" "SectorPrioridad" NOT NULL,
    "tipoSolicitud" "TipoSolicitud" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL,
    "periodoId" TEXT NOT NULL,
    "numeroRegistro" TEXT NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoSolicitud" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "fechaValidacion" TIMESTAMP(3),
    "validadorId" TEXT,

    CONSTRAINT "DocumentoSolicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comision" (
    "id" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionComision" (
    "id" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "actaUrl" TEXT,

    CONSTRAINT "SesionComision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionSolicitud" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "resultado" "ResultadoDecision" NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "DecisionSolicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "circuloId" TEXT NOT NULL,
    "fechaOtorgamiento" TIMESTAMP(3) NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoMatricula" NOT NULL,
    "boletaUrl" TEXT,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlTrimestral" (
    "id" TEXT NOT NULL,
    "matriculaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "vinculo" "VinculoLaboral" NOT NULL,
    "observaciones" TEXT,
    "funcionarioId" TEXT NOT NULL,

    CONSTRAINT "ControlTrimestral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trazabilidad" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "comentario" TEXT,

    CONSTRAINT "Trazabilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_carnetIdentidad_key" ON "Tutor"("carnetIdentidad");

-- CreateIndex
CREATE UNIQUE INDEX "Nino_tarjetaMenor_key" ON "Nino"("tarjetaMenor");

-- CreateIndex
CREATE UNIQUE INDEX "CapacidadCirculo_idCirculo_idPeriodo_key" ON "CapacidadCirculo"("idCirculo", "idPeriodo");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitud_ninoId_key" ON "Solicitud"("ninoId");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_solicitudId_key" ON "Matricula"("solicitudId");

-- AddForeignKey
ALTER TABLE "Nino" ADD CONSTRAINT "Nino_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacidadCirculo" ADD CONSTRAINT "CapacidadCirculo_idCirculo_fkey" FOREIGN KEY ("idCirculo") REFERENCES "CirculoInfantil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacidadCirculo" ADD CONSTRAINT "CapacidadCirculo_idPeriodo_fkey" FOREIGN KEY ("idPeriodo") REFERENCES "PeriodoOtorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "Nino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoOtorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoSolicitud" ADD CONSTRAINT "DocumentoSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoSolicitud" ADD CONSTRAINT "DocumentoSolicitud_validadorId_fkey" FOREIGN KEY ("validadorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionComision" ADD CONSTRAINT "SesionComision_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "Comision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionComision" ADD CONSTRAINT "SesionComision_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoOtorgamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionSolicitud" ADD CONSTRAINT "DecisionSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionSolicitud" ADD CONSTRAINT "DecisionSolicitud_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SesionComision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "CirculoInfantil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlTrimestral" ADD CONSTRAINT "ControlTrimestral_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "Matricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlTrimestral" ADD CONSTRAINT "ControlTrimestral_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trazabilidad" ADD CONSTRAINT "Trazabilidad_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trazabilidad" ADD CONSTRAINT "Trazabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Tutor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
