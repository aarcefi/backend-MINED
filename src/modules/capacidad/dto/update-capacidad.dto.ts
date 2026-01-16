import { PartialType } from '@nestjs/swagger';
import { CreateCapacidadDto } from './create-capacidad.dto';

export class UpdateCapacidadDto extends PartialType(CreateCapacidadDto) {}
