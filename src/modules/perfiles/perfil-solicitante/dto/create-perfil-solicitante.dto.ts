import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { TipoPersona } from '@prisma/client';

export class CreatePerfilSolicitanteDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  apellidos: string;

  @ApiProperty()
  @IsString()
  carnetIdentidad: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty()
  @IsString()
  direccion: string;

  @ApiProperty()
  @IsString()
  municipio: string;

  @ApiProperty()
  @IsString()
  provincia: string;

  @ApiProperty({ enum: TipoPersona })
  @IsEnum(TipoPersona)
  tipoPersona: TipoPersona;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cantHijos?: number = 1;
}
