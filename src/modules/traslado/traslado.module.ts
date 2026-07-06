import { Module } from '@nestjs/common';
import { TrasladoController } from './traslado.controller';
import { TrasladoService } from './traslado.service';

@Module({
  controllers: [TrasladoController],
  providers: [TrasladoService],
})
export class TrasladoModule {}
