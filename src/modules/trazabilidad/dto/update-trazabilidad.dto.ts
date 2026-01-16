import { PartialType } from '@nestjs/swagger';
import { CreateTrazabilidadDto } from './create-trazabilidad.dto';

export class UpdateTrazabilidadDto extends PartialType(CreateTrazabilidadDto) {}
