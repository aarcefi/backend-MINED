import { PartialType } from '@nestjs/swagger';
import { CreateCirculoInfantilDto } from './create-circulo-infantil.dto';

export class UpdateCirculoInfantilDto extends PartialType(CreateCirculoInfantilDto) {}
