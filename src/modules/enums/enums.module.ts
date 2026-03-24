import { Module } from '@nestjs/common';
import { EnumsService } from './enums.service';
import { EnumsController } from './enums.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EnumsController],
  providers: [EnumsService],
  exports: [EnumsService],
})
export class EnumsModule {}
