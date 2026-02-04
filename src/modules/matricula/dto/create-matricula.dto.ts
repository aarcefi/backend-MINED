import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EstadoMatricula } from '@prisma/client';

export class CreateMatriculaDto {
  @ApiProperty({ description: 'ID de la solicitud aprobada' })
  @IsString()
  solicitudId: string;

  @ApiProperty({ description: 'ID del círculo infantil asignado' })
  @IsString()
  circuloId: string;

  @ApiProperty({ description: 'Fecha de otorgamiento de la matrícula' })
  @IsDateString()
  fechaOtorgamiento: Date;

  @ApiProperty({ description: 'Fecha límite para formalizar la matrícula' })
  @IsDateString()
  fechaLimite: Date;

  @ApiPropertyOptional({
    enum: EstadoMatricula,
    description: 'Estado de la matrícula',
  })
  @IsOptional()
  @IsEnum(EstadoMatricula)
  estado?: EstadoMatricula;

  @ApiPropertyOptional({ description: 'URL de la boleta de matrícula digital' })
  @IsOptional()
  @IsString()
  boletaUrl?: string;
}
