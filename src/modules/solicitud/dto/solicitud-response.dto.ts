import { ApiProperty } from '@nestjs/swagger';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '@prisma/client';

export class NinoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellidos: string;

  @ApiProperty()
  tarjetaMenor: string;

  @ApiProperty()
  fechaNacimiento: Date;

  @ApiProperty()
  sexo: string;

  @ApiProperty()
  casoEspecial: boolean;

  @ApiProperty()
  tipoNecesidad?: string;
}

export class PeriodoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  fechaInicio: Date;

  @ApiProperty()
  fechaCierre: Date;
}

export class SolicitanteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellidos: string;

  @ApiProperty()
  municipio: string;
}

export class DocumentoSolicitudResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  validado: boolean;
}

export class SolicitudResponseDto {
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

  @ApiProperty({ required: false })
  observaciones?: string;

  @ApiProperty({ type: NinoResponseDto })
  nino: NinoResponseDto;

  @ApiProperty({ type: PeriodoResponseDto })
  periodo: PeriodoResponseDto;

  @ApiProperty({ type: SolicitanteResponseDto })
  solicitante: SolicitanteResponseDto;

  @ApiProperty({ type: [DocumentoSolicitudResponseDto], required: false })
  documentos?: DocumentoSolicitudResponseDto[];

  @ApiProperty({ type: Object, required: false })
  matricula?: any;
}
