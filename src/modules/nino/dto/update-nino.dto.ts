import { PartialType } from '@nestjs/swagger';
import { CreateNinoDto } from './create-nino.dto';

export class UpdateNinoDto extends PartialType(CreateNinoDto) {}
