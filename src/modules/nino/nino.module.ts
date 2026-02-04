import { Module } from '@nestjs/common';
import { NinosService } from './nino.service';
import { NinoController } from './nino.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NinoController],
  providers: [NinosService],
  exports: [NinosService],
})
export class NinosModule {}
