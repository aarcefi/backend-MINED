import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CambiarEstadoDto {
  @ApiProperty({
    enum: EstadoSolicitud,
    example: EstadoSolicitud.APROBADA_COMISION,
  })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;

  @ApiPropertyOptional({ example: 'Aprobada por comisión' })
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiPropertyOptional({
    description:
      'UUID del círculo donde se otorga la plaza (requerido para APROBADA_COMISION)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  circuloId?: string;
}
