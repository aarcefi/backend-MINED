CREATE TABLE "traslados_solicitud" (
  "id" UUID NOT NULL,
  "solicitanteId" UUID NOT NULL,
  "ninoId" UUID NOT NULL,
  "matriculaId" UUID NOT NULL,
  "circuloOrigenId" UUID NOT NULL,
  "circuloDestinoId" UUID NOT NULL,
  "motivo" TEXT NOT NULL,
  "estado" "EstadoSolicitud" NOT NULL DEFAULT 'EN_REVISION',
  "fechaSolicitud" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaRespuesta" TIMESTAMP,
  "comentarioRespuesta" TEXT,
  "respondidoPorId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "traslados_solicitud_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "traslados_solicitud_solicitanteId_idx" ON "traslados_solicitud"("solicitanteId");
CREATE INDEX "traslados_solicitud_matriculaId_idx" ON "traslados_solicitud"("matriculaId");
CREATE INDEX "traslados_solicitud_estado_idx" ON "traslados_solicitud"("estado");

ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "perfiles_solicitantes"("id") ON DELETE CASCADE;
ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "ninos"("id") ON DELETE CASCADE;
ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matriculas"("id") ON DELETE CASCADE;
ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_circuloOrigenId_fkey" FOREIGN KEY ("circuloOrigenId") REFERENCES "circulos_infantiles"("id") ON DELETE RESTRICT;
ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_circuloDestinoId_fkey" FOREIGN KEY ("circuloDestinoId") REFERENCES "circulos_infantiles"("id") ON DELETE RESTRICT;
ALTER TABLE "traslados_solicitud" ADD CONSTRAINT "traslados_solicitud_respondidoPorId_fkey" FOREIGN KEY ("respondidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL;
