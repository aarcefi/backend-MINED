// update-solicitud.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '@prisma/client';

export class UpdateSolicitudDto {
  @ApiProperty({ enum: SectorPrioridad, required: false })
  @IsOptional()
  @IsEnum(SectorPrioridad)
  sector?: SectorPrioridad;

  @ApiProperty({ enum: TipoSolicitud, required: false })
  @IsOptional()
  @IsEnum(TipoSolicitud)
  tipoSolicitud?: TipoSolicitud;

  @ApiProperty({ enum: EstadoSolicitud, required: false })
  @IsOptional()
  @IsEnum(EstadoSolicitud)
  estado?: EstadoSolicitud;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  necesitaActualizarPrioridad?: boolean = false;
}
