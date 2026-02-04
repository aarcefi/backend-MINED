import { PartialType } from '@nestjs/swagger';
import { CreateControlTrimestralDto } from './create-control-trimestral.dto';

export class UpdateControlTrimestralDto extends PartialType(CreateControlTrimestralDto) {}
