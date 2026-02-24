-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('MADRE', 'PADRE', 'TUTOR');

-- CreateEnum
CREATE TYPE "TipoSolicitud" AS ENUM ('TRABAJADOR', 'ESTUDIANTE', 'CASO_SOCIAL');

-- CreateEnum
CREATE TYPE "SectorPrioridad" AS ENUM ('SALUD', 'EDUCACION', 'DEFENSA', 'CASO_SOCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('EN_REVISION', 'APROBADA', 'RECHAZADA', 'EN_ESPERA');

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

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SOLICITANTE', 'FUNCIONARIO_MUNICIPAL', 'COMISION_OTORGAMIENTO', 'DIRECTOR_CIRCULO', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "carnetIdentidad" TEXT NOT NULL,
    "telefono" TEXT,
    "municipio" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_solicitantes" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "direccion" TEXT NOT NULL,
    "tipoPersona" "TipoPersona" NOT NULL,
    "cantHijos" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "perfiles_solicitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_funcionarios" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,

    CONSTRAINT "perfiles_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_comisiones" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "cargo" TEXT NOT NULL,

    CONSTRAINT "perfiles_comisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_directores" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "circuloId" UUID NOT NULL,

    CONSTRAINT "perfiles_directores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ninos" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fechaNacimiento" DATE NOT NULL,
    "sexo" TEXT NOT NULL,
    "tarjetaMenor" TEXT NOT NULL,
    "solicitanteId" UUID NOT NULL,
    "casoEspecial" BOOLEAN NOT NULL DEFAULT false,
    "tipoNecesidad" TEXT,

    CONSTRAINT "ninos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circulos_infantiles" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "capacidadTotal" INTEGER NOT NULL,
    "tipo" "TipoCirculo" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" TEXT,

    CONSTRAINT "circulos_infantiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_otorgamiento" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaCierre" DATE NOT NULL,
    "fechaAsignacion" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "periodos_otorgamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacidades_circulos" (
    "id" UUID NOT NULL,
    "circuloId" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "cuposDisponibles" INTEGER NOT NULL,
    "cuposOcupados" INTEGER NOT NULL,

    CONSTRAINT "capacidades_circulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" UUID NOT NULL,
    "ninoId" UUID NOT NULL,
    "solicitanteId" UUID NOT NULL,
    "fechaSolicitud" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sector" "SectorPrioridad" NOT NULL,
    "tipoSolicitud" "TipoSolicitud" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'EN_REVISION',
    "periodoId" UUID NOT NULL,
    "observaciones" TEXT,
    "prioridad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_solicitud" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "fechaValidacion" TIMESTAMP,
    "validadorId" UUID,

    CONSTRAINT "documentos_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_comision" (
    "id" UUID NOT NULL,
    "periodoId" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "actaUrl" TEXT,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "sesiones_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisiones_solicitud" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "sesionId" UUID NOT NULL,
    "comisionId" UUID NOT NULL,
    "resultado" "ResultadoDecision" NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "decisiones_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "circuloId" UUID NOT NULL,
    "fechaOtorgamiento" TIMESTAMP NOT NULL,
    "fechaLimite" DATE NOT NULL,
    "estado" "EstadoMatricula" NOT NULL DEFAULT 'ACTIVA',
    "boletaUrl" TEXT,
    "folio" TEXT NOT NULL,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_trimestrales" (
    "id" UUID NOT NULL,
    "matriculaId" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "vinculo" "VinculoLaboral" NOT NULL,
    "observaciones" TEXT,
    "funcionarioId" UUID NOT NULL,

    CONSTRAINT "controles_trimestrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trazabilidades" (
    "id" UUID NOT NULL,
    "solicitudId" UUID NOT NULL,
    "estadoAnterior" "EstadoSolicitud",
    "estadoNuevo" "EstadoSolicitud" NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" UUID NOT NULL,
    "comentario" TEXT,

    CONSTRAINT "trazabilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_carnetIdentidad_key" ON "usuarios"("carnetIdentidad");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_solicitantes_usuarioId_key" ON "perfiles_solicitantes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_funcionarios_usuarioId_key" ON "perfiles_funcionarios"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_comisiones_usuarioId_key" ON "perfiles_comisiones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_directores_usuarioId_key" ON "perfiles_directores"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_directores_circuloId_key" ON "perfiles_directores"("circuloId");

-- CreateIndex
CREATE UNIQUE INDEX "ninos_tarjetaMenor_key" ON "ninos"("tarjetaMenor");

-- CreateIndex
CREATE UNIQUE INDEX "capacidades_circulos_circuloId_periodoId_key" ON "capacidades_circulos"("circuloId", "periodoId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_ninoId_key" ON "solicitudes"("ninoId");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_solicitudId_key" ON "matriculas"("solicitudId");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_folio_key" ON "matriculas"("folio");

-- AddForeignKey
ALTER TABLE "perfiles_solicitantes" ADD CONSTRAINT "perfiles_solicitantes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_funcionarios" ADD CONSTRAINT "perfiles_funcionarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_comisiones" ADD CONSTRAINT "perfiles_comisiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_directores" ADD CONSTRAINT "perfiles_directores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_directores" ADD CONSTRAINT "perfiles_directores_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "circulos_infantiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ninos" ADD CONSTRAINT "ninos_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "perfiles_solicitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidades_circulos" ADD CONSTRAINT "capacidades_circulos_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "circulos_infantiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidades_circulos" ADD CONSTRAINT "capacidades_circulos_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "ninos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "perfiles_solicitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_solicitud" ADD CONSTRAINT "documentos_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_solicitud" ADD CONSTRAINT "documentos_solicitud_validadorId_fkey" FOREIGN KEY ("validadorId") REFERENCES "perfiles_funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_comision" ADD CONSTRAINT "sesiones_comision_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_solicitud" ADD CONSTRAINT "decisiones_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_solicitud" ADD CONSTRAINT "decisiones_solicitud_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisiones_solicitud" ADD CONSTRAINT "decisiones_solicitud_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "perfiles_comisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "circulos_infantiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_trimestrales" ADD CONSTRAINT "controles_trimestrales_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matriculas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_trimestrales" ADD CONSTRAINT "controles_trimestrales_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "perfiles_funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidades" ADD CONSTRAINT "trazabilidades_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidades" ADD CONSTRAINT "trazabilidades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
