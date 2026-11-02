// update-solicitud.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsString,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
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

  @ApiProperty({ required: false, description: 'Solo Comisión de Otorgamiento' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prioridad?: number;

  @ApiProperty({
    description: 'ID del círculo infantil al que se desea matricular al niño',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  circuloId?: string;
}
