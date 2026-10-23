import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '../../../common/enums';

export class NinoDataDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Pérez López' })
  @IsString()
  apellidos: string;

  @ApiProperty({ example: '2020-05-15' })
  @IsDateString()
  fechaNacimiento: string; // Cambiar a string

  @ApiProperty({ example: 'MASCULINO' })
  @IsString()
  sexo: string;

  @ApiProperty({ example: 'TM123456789' })
  @IsString()
  tarjetaMenor: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  casoEspecial?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipoNecesidad?: string;
}

export class CreateSolicitudDto {
  @ApiProperty()
  @IsUUID()
  solicitanteId: string;

  @ApiProperty({ enum: SectorPrioridad })
  @IsEnum(SectorPrioridad)
  sector: SectorPrioridad;

  @ApiProperty({ enum: TipoSolicitud })
  @IsEnum(TipoSolicitud)
  tipoSolicitud: TipoSolicitud;

  @ApiProperty({ enum: EstadoSolicitud, default: EstadoSolicitud.EN_REVISION })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud = EstadoSolicitud.EN_REVISION;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'ID del círculo infantil al que se desea matricular al niño',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  circuloId?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => NinoDataDto)
  nino: NinoDataDto;
}
