import { Module } from '@nestjs/common';
import { ControlTrimestralService } from './control-trimestral.service';
import { ControlTrimestralController } from './control-trimestral.controller';

@Module({
  controllers: [ControlTrimestralController],
  providers: [ControlTrimestralService],
})
export class ControlTrimestralModule {}
