import { ApiProperty } from '@nestjs/swagger';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '@prisma/client';

export class SolicitudListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fechaSolicitud: Date;

  @ApiProperty({ enum: SectorPrioridad })
  sector: SectorPrioridad;

  @ApiProperty({ enum: TipoSolicitud })
  tipoSolicitud: TipoSolicitud;

  @ApiProperty({ enum: EstadoSolicitud })
  estado: EstadoSolicitud;

  @ApiProperty()
  prioridad: number;

  @ApiProperty()
  ninoNombre: string;

  @ApiProperty()
  ninoApellidos: string;

  @ApiProperty()
  ninoTarjetaMenor: string;

  @ApiProperty()
  solicitanteNombre: string;

  @ApiProperty()
  solicitanteApellidos: string;

  @ApiProperty()
  periodoNombre: string;

  @ApiProperty()
  tieneDocumentos: boolean;

  @ApiProperty()
  tieneMatricula: boolean;
}
