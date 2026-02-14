import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateNinoDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  apellidos: string;

  @ApiProperty()
  @IsDateString()
  fechaNacimiento: string;

  @ApiProperty()
  @IsString()
  sexo: string;

  @ApiProperty()
  @IsString()
  tarjetaMenor: string;

  @ApiProperty()
  @IsUUID()
  solicitanteId: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  casoEspecial?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoNecesidad?: string;
}
