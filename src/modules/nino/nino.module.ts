import { Module } from '@nestjs/common';
import { NinoService } from './nino.service';
import { NinoController } from './nino.controller';

@Module({
  controllers: [NinoController],
  providers: [NinoService],
})
export class NinoModule {}
