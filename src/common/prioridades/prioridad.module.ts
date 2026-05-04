import { Module } from '@nestjs/common';
import { PriorityCalculator } from './prioridad-calc.service.';

@Module({
  providers: [PriorityCalculator],
  exports: [PriorityCalculator],
})
export class PriorityModule {}
