import { Module } from '@nestjs/common';
import { CapacidadService } from './capacidad.service';
import { CapacidadController } from './capacidad.controller';

@Module({
  controllers: [CapacidadController],
  providers: [CapacidadService],
})
export class CapacidadModule {}
