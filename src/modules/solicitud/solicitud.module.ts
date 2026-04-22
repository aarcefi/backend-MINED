import { forwardRef, Module } from '@nestjs/common';
import { SolicitudService } from './solicitud.service';
import { SolicitudController } from './solicitud.controller';
import { PeriodoOtorgamientoModule } from '../periodo/periodo.module';
import { NinosModule } from '../nino/nino.module';
import { TrazabilidadModule } from '../trazabilidad/trazabilidad.module';
import { ValidacionIdentidadModule } from '../validacion-ficha-unica/validacion-ficha-unica.module';
import { PriorityModule } from '../prioridades/prioridad.module';

@Module({
  imports: [
    PeriodoOtorgamientoModule,
    NinosModule,
    ValidacionIdentidadModule,
    forwardRef(() => TrazabilidadModule),
    PriorityModule,
  ],
  controllers: [SolicitudController],
  providers: [SolicitudService],
  exports: [SolicitudService],
})
export class SolicitudModule {}
