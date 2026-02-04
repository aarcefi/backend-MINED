import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  Length,
} from 'class-validator';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '../../../common/enums';

export class CreateSolicitudDto {
  @ApiProperty()
  @IsUUID()
  ninoId: string;

  @ApiProperty()
  @IsUUID()
  solicitanteId: string;

  @ApiProperty()
  @IsDateString()
  fechaSolicitud: string;

  @ApiProperty({ enum: SectorPrioridad })
  @IsEnum(SectorPrioridad)
  sector: SectorPrioridad;

  @ApiProperty({ enum: TipoSolicitud })
  @IsEnum(TipoSolicitud)
  tipoSolicitud: TipoSolicitud;

  @ApiProperty({ enum: EstadoSolicitud })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;

  @ApiProperty()
  @IsUUID()
  periodoId: string;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  numeroRegistro: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
