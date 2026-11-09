import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectorPrioridad } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ConfigurarPrioridadDto {
  @ApiProperty({ enum: SectorPrioridad, example: 'SALUD' })
  @IsEnum(SectorPrioridad)
  sectorPrioritario1: SectorPrioridad;

  @ApiPropertyOptional({ enum: SectorPrioridad, example: 'EDUCACION' })
  @IsOptional()
  @IsEnum(SectorPrioridad)
  sectorPrioritario2?: SectorPrioridad;

  @ApiPropertyOptional({ enum: SectorPrioridad, example: 'DEFENSA' })
  @IsOptional()
  @IsEnum(SectorPrioridad)
  sectorPrioritario3?: SectorPrioridad;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Por defecto, el período activo',
  })
  @IsOptional()
  @IsUUID()
  periodoId?: string;
}
