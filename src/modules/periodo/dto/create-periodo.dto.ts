import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsDateString } from 'class-validator';

export class CreatePeriodoDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiProperty()
  @IsDateString()
  fechaInicio: string;

  @ApiProperty()
  @IsDateString()
  fechaCierre: string;

  @ApiProperty()
  @IsDateString()
  fechaAsignacion: string;
}
