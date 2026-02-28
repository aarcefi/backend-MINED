import { forwardRef, Module } from '@nestjs/common';
import { TrazabilidadService } from './trazabilidad.service';
import { TrazabilidadController } from './trazabilidad.controller';
import { SolicitudModule } from '../solicitud/solicitud.module';
import { UsuariosModule } from '../usuario/usuarios.module';

@Module({
  imports: [UsuariosModule, forwardRef(() => SolicitudModule)],
  controllers: [TrazabilidadController],
  providers: [TrazabilidadService],
  exports: [TrazabilidadService],
})
export class TrazabilidadModule {}
