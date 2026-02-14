import { Module } from '@nestjs/common';
import { SolicitudService } from './solicitud.service';
import { SolicitudController } from './solicitud.controller';
import { TrazabilidadService } from '../trazabilidad/trazabilidad.service';
import { NinosService } from '../nino/nino.service';

@Module({
  controllers: [SolicitudController],
  providers: [SolicitudService, TrazabilidadService, NinosService],
})
export class SolicitudModule {}
