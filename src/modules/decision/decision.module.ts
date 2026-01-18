import { Module } from '@nestjs/common';
import { DecisionSolicitudService } from './decision.service';
import { DecisionSolicitudController } from './decision.controller';

@Module({
  controllers: [DecisionSolicitudController],
  providers: [DecisionSolicitudService],
})
export class DecisionSolicitudModule {}
