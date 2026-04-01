import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PeriodoService } from './periodo.service';
import { PeriodoOtorgamientoController } from './periodo.controller';
import { PeriodoSchedulerService } from './periodo-scheduler.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [PeriodoOtorgamientoController],
  providers: [PeriodoService, PeriodoSchedulerService],
  exports: [PeriodoService],
})
export class PeriodoOtorgamientoModule {}
