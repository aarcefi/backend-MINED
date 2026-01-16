import { Module } from '@nestjs/common';
import { SesionService } from './sesion.service';
import { SesionController } from './sesion.controller';

@Module({
  controllers: [SesionController],
  providers: [SesionService],
})
export class SesionModule {}
