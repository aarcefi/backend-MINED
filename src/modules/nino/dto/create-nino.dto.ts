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
  fechaNacimiento: Date;

  @ApiProperty()
  @IsString()
  sexo: string;

  @ApiProperty()
  @IsString()
  tarjetaMenor: string;

  @ApiProperty()
  @IsUUID()
  solicitanteId: string; // ID del PerfilSolicitante

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  casoEspecial?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoNecesidad?: string;
}
