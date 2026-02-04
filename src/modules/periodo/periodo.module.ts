import { Module } from '@nestjs/common';
import { PeriodoService } from './periodo.service';
import { PeriodoOtorgamientoController } from './periodo.controller';

@Module({
  controllers: [PeriodoOtorgamientoController],
  providers: [PeriodoService],
})
export class PeriodoOtorgamientoModule {}
