import { ApiProperty } from '@nestjs/swagger';
import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
  TipoPersona,
  TipoCirculo,
} from '@prisma/client';
import { AnioVida } from 'src/common';

export class NinoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() apellidos: string;
  @ApiProperty() tarjetaMenor: string;
  @ApiProperty() fechaNacimiento: Date;
  @ApiProperty() sexo: string;
  @ApiProperty() casoEspecial: boolean;
  @ApiProperty() tipoNecesidad?: string;
}

export class PeriodoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() fechaInicio: Date;
  @ApiProperty() fechaCierre: Date;
}

export class CirculoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nombre: string;
  @ApiProperty() direccion: string;
  @ApiProperty() municipio: string;
  @ApiProperty() provincia: string;
  @ApiProperty({ enum: TipoCirculo }) tipo: TipoCirculo;
  @ApiProperty() tieneSextoAnio: boolean;
}

export class SolicitanteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() correo: string;
  @ApiProperty() nombre: string;
  @ApiProperty() apellidos: string;
  @ApiProperty() carnetIdentidad: string;
  @ApiProperty() telefono: string;
  @ApiProperty() direccion: string;
  @ApiProperty() tipoPersona: TipoPersona;
  @ApiProperty() cantHijos: number;
  @ApiProperty() centroTrabajo: string;
  @ApiProperty() municipio: string;
  @ApiProperty() provincia: string;
}

export class DocumentoSolicitudResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tipo: string;
  @ApiProperty() url: string;
  @ApiProperty() validado: boolean;
}

export class SolicitudResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() fechaSolicitud: Date;
  @ApiProperty({ enum: AnioVida }) anioVida: AnioVida;
  @ApiProperty({ enum: SectorPrioridad }) sector: SectorPrioridad;
  @ApiProperty({ enum: TipoSolicitud }) tipoSolicitud: TipoSolicitud;
  @ApiProperty({ enum: EstadoSolicitud }) estado: EstadoSolicitud;
  @ApiProperty() prioridad: number;
  @ApiProperty({ required: false }) observaciones?: string;

  @ApiProperty({ type: NinoResponseDto }) nino: NinoResponseDto;
  @ApiProperty({ type: PeriodoResponseDto }) periodo: PeriodoResponseDto;
  @ApiProperty({ type: SolicitanteResponseDto }) solicitante: SolicitanteResponseDto;

  @ApiProperty({ type: CirculoResponseDto, required: false })
  circulo?: CirculoResponseDto | null;

  @ApiProperty({ type: [DocumentoSolicitudResponseDto], required: false })
  documentos?: DocumentoSolicitudResponseDto[];

  @ApiProperty({ required: false, nullable: true })
  motivoDenegacion?: string | null;

  @ApiProperty({ type: Object, required: false })
  matricula?: any;
}
