import { Module } from '@nestjs/common';
import { ComisionService } from './comision.service';
import { ComisionController } from './comision.controller';

@Module({
  controllers: [ComisionController],
  providers: [ComisionService],
})
export class ComisionModule {}
