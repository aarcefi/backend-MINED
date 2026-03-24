import { Module } from '@nestjs/common';
import { ValidacionIdentidadService } from './validacion-ficha-unica.service';
import { ValidacionIdentidadController } from './validacion-ficha-unica.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ValidacionIdentidadController],
  providers: [ValidacionIdentidadService],
  exports: [ValidacionIdentidadService],
})
export class ValidacionIdentidadModule {}
