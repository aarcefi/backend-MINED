import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsDateString,
  Length,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateNinoDto {
  @ApiProperty()
  @IsString()
  @Length(2, 50)
  nombre: string;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  apellidos: string;

  @ApiProperty()
  @IsDateString()
  fechaNacimiento: string;

  @ApiProperty()
  @IsString()
  sexo: string;

  @ApiProperty()
  @IsString()
  @Length(11, 11)
  tarjetaMenor: string;

  @ApiProperty()
  @IsUUID()
  tutorId: string;

  @ApiProperty()
  @IsBoolean()
  casoEspecial: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoNecesidad?: string;
}
