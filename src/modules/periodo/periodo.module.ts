import { Module } from '@nestjs/common';
import { PeriodoService } from './periodo.service';
import { PeriodoController } from './periodo.controller';

@Module({
  controllers: [PeriodoController],
  providers: [PeriodoService],
})
export class PeriodoModule {}
