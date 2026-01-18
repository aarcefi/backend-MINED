-- DropForeignKey
ALTER TABLE "capacidad_circulo" DROP CONSTRAINT "capacidad_circulo_idCirculo_fkey";

-- DropForeignKey
ALTER TABLE "capacidad_circulo" DROP CONSTRAINT "capacidad_circulo_idPeriodo_fkey";

-- DropForeignKey
ALTER TABLE "control_trimestral" DROP CONSTRAINT "control_trimestral_funcionarioId_fkey";

-- DropForeignKey
ALTER TABLE "control_trimestral" DROP CONSTRAINT "control_trimestral_matriculaId_fkey";

-- DropForeignKey
ALTER TABLE "decision_solicitud" DROP CONSTRAINT "decision_solicitud_sesionId_fkey";

-- DropForeignKey
ALTER TABLE "decision_solicitud" DROP CONSTRAINT "decision_solicitud_solicitudId_fkey";

-- DropForeignKey
ALTER TABLE "documento_solicitud" DROP CONSTRAINT "documento_solicitud_solicitudId_fkey";

-- DropForeignKey
ALTER TABLE "matricula" DROP CONSTRAINT "matricula_circuloId_fkey";

-- DropForeignKey
ALTER TABLE "matricula" DROP CONSTRAINT "matricula_solicitudId_fkey";

-- DropForeignKey
ALTER TABLE "nino" DROP CONSTRAINT "nino_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "sesion_comision" DROP CONSTRAINT "sesion_comision_comisionId_fkey";

-- DropForeignKey
ALTER TABLE "sesion_comision" DROP CONSTRAINT "sesion_comision_periodoId_fkey";

-- DropForeignKey
ALTER TABLE "solicitud" DROP CONSTRAINT "solicitud_ninoId_fkey";

-- DropForeignKey
ALTER TABLE "solicitud" DROP CONSTRAINT "solicitud_periodoId_fkey";

-- DropForeignKey
ALTER TABLE "solicitud" DROP CONSTRAINT "solicitud_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "trazabilidad" DROP CONSTRAINT "trazabilidad_solicitudId_fkey";

-- DropForeignKey
ALTER TABLE "trazabilidad" DROP CONSTRAINT "trazabilidad_usuarioId_fkey";

-- AddForeignKey
ALTER TABLE "nino" ADD CONSTRAINT "nino_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad_circulo" ADD CONSTRAINT "capacidad_circulo_idCirculo_fkey" FOREIGN KEY ("idCirculo") REFERENCES "circulo_infantil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad_circulo" ADD CONSTRAINT "capacidad_circulo_idPeriodo_fkey" FOREIGN KEY ("idPeriodo") REFERENCES "periodo_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_ninoId_fkey" FOREIGN KEY ("ninoId") REFERENCES "nino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodo_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_solicitud" ADD CONSTRAINT "documento_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_comision" ADD CONSTRAINT "sesion_comision_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_comision" ADD CONSTRAINT "sesion_comision_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodo_otorgamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_solicitud" ADD CONSTRAINT "decision_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_solicitud" ADD CONSTRAINT "decision_solicitud_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesion_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_circuloId_fkey" FOREIGN KEY ("circuloId") REFERENCES "circulo_infantil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_trimestral" ADD CONSTRAINT "control_trimestral_matriculaId_fkey" FOREIGN KEY ("matriculaId") REFERENCES "matricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_trimestral" ADD CONSTRAINT "control_trimestral_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidad" ADD CONSTRAINT "trazabilidad_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trazabilidad" ADD CONSTRAINT "trazabilidad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
