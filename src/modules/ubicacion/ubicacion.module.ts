import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UbicacionController } from './ubicacion.controller';
import { UbicacionService } from './ubicacion.service';

@Module({
  imports: [PrismaModule],
  controllers: [UbicacionController],
  providers: [UbicacionService],
})
export class UbicacionModule {}
