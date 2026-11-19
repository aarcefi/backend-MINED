import { Module } from '@nestjs/common';
import { CapacidadCirculoService } from './capacidad.service';
import { CapacidadCirculoController } from './capacidad.controller';
import { CapacidadStartupService } from './capacidad-startup.service';

@Module({
  controllers: [CapacidadCirculoController],
  providers: [CapacidadCirculoService, CapacidadStartupService],
})
export class CapacidadCirculoModule {}
