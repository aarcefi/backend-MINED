import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { VinculoLaboral } from '../../../common/enums';

export class CreateControlTrimestralDto {
  @ApiProperty()
  @IsUUID()
  matriculaId: string;

  @ApiProperty()
  @IsDateString()
  fecha: string;

  @ApiProperty({ enum: VinculoLaboral })
  @IsEnum(VinculoLaboral)
  vinculo: VinculoLaboral;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty()
  @IsUUID()
  funcionarioId: string;
}
