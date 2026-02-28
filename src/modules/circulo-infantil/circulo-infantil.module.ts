import { Module } from '@nestjs/common';
import { CirculoInfantilService } from './circulo-infantil.service';
import { CirculoInfantilController } from './circulo-infantil.controller';

@Module({
  controllers: [CirculoInfantilController],
  providers: [CirculoInfantilService],
  exports: [CirculoInfantilService],
})
export class CirculoInfantilModule {}
