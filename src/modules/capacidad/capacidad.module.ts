import { Module } from '@nestjs/common';
import { CapacidadCirculoService } from './capacidad.service';
import { CapacidadCirculoController } from './capacidad.controller';

@Module({
  controllers: [CapacidadCirculoController],
  providers: [CapacidadCirculoService],
})
export class CapacidadCirculoModule {}
