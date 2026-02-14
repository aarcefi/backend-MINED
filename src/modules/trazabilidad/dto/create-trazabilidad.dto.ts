import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  Length,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { EstadoSolicitud } from '@prisma/client';

export class CreateTrazabilidadDto {
  @ApiProperty()
  @IsUUID()
  solicitudId: string;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  estadoAnterior?: EstadoSolicitud | null;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  estadoNuevo: EstadoSolicitud;

  @ApiProperty()
  @IsDateString()
  fecha: string;

  @ApiProperty()
  @IsUUID()
  usuarioId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comentario?: string;
}
