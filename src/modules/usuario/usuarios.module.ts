import { forwardRef, Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PerfilesModule } from '../perfiles/perfiles.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PerfilesModule)],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
