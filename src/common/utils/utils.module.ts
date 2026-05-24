import { Global, Module } from '@nestjs/common';
import { DateUtilsService } from './date-utils.service';

@Global()
@Module({
  providers: [DateUtilsService],
  exports: [DateUtilsService],
})
export class UtilsModule {}
