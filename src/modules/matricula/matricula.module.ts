import { Module } from '@nestjs/common';
import { MatriculasService } from './matricula.service';
import { MatriculaController } from './matricula.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MatriculaController],
  providers: [MatriculasService],
  exports: [MatriculasService],
})
export class MatriculasModule {}
