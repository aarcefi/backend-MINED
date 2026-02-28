import { forwardRef, Module } from '@nestjs/common';
import { PerfilesService } from './perfiles.service';
import { PerfilesController } from './perfiles.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CirculoInfantilModule } from '../circulo-infantil/circulo-infantil.module';
import { UsuariosModule } from '../usuario/usuarios.module';

@Module({
  imports: [
    PrismaModule,
    CirculoInfantilModule,
    forwardRef(() => UsuariosModule),
  ],
  controllers: [PerfilesController],
  providers: [PerfilesService],
  exports: [PerfilesService],
})
export class PerfilesModule {}
