import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { EstadoMatricula } from '../../../common/enums';

export class CreateMatriculaDto {
  @ApiProperty()
  @IsUUID()
  solicitudId: string;

  @ApiProperty()
  @IsUUID()
  circuloId: string;

  @ApiProperty()
  @IsDateString()
  fechaOtorgamiento: string;

  @ApiProperty()
  @IsDateString()
  fechaLimite: string;

  @ApiProperty({ enum: EstadoMatricula })
  @IsEnum(EstadoMatricula)
  estado: EstadoMatricula;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  boletaUrl?: string;
}
