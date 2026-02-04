import { Module } from '@nestjs/common';
import { SesionComisionService } from './sesion.service';
import { SesionComisionController } from './sesion.controller';

@Module({
  controllers: [SesionComisionController],
  providers: [SesionComisionService],
})
export class SesionComisionModule {}
