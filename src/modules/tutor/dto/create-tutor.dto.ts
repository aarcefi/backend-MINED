import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  Length,
  IsInt,
  Min,
} from 'class-validator';
import { TipoPersona } from '../../../common/enums';

export class CreateTutorDto {
  @ApiProperty()
  @IsString()
  @Length(2, 50)
  nombre: string;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  apellidos: string;

  @ApiProperty()
  @IsString()
  @Length(11, 11)
  carnetIdentidad: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ enum: TipoPersona })
  @IsEnum(TipoPersona)
  tipoPersona: TipoPersona;

  @ApiProperty()
  @IsBoolean()
  activo: boolean;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cantHijo: number;
}
