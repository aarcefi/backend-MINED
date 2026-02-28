import { forwardRef, Module } from '@nestjs/common';
import { SolicitudService } from './solicitud.service';
import { SolicitudController } from './solicitud.controller';
import { PeriodoOtorgamientoModule } from '../periodo/periodo.module';
import { NinosModule } from '../nino/nino.module';
import { TrazabilidadModule } from '../trazabilidad/trazabilidad.module';

@Module({
  imports: [
    PeriodoOtorgamientoModule,
    NinosModule,
    forwardRef(() => TrazabilidadModule),
  ],
  controllers: [SolicitudController],
  providers: [SolicitudService],
  exports: [SolicitudService],
})
export class SolicitudModule {}
