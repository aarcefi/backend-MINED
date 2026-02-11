import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateNinoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiProperty({ required: false, example: '2026-02-11' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato YYYY-MM-DD',
  })
  fechaNacimiento?: string;

  @ApiProperty({ required: false, example: 'M' })
  @IsOptional()
  @IsString()
  sexo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tarjetaMenor?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  casoEspecial?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoNecesidad?: string;
}
