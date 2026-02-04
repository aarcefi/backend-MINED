import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ResultadoDecision } from '../../../common/enums';

export class CreateDecisionDto {
  @ApiProperty()
  @IsUUID()
  solicitudId: string;

  @ApiProperty()
  @IsUUID()
  sesionId: string;

  @ApiProperty()
  @IsUUID()
  comisionId: string;

  @ApiProperty({ enum: ResultadoDecision })
  @IsEnum(ResultadoDecision)
  resultado: ResultadoDecision;

  @ApiProperty()
  @IsInt()
  @Min(0)
  puntuacion: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
