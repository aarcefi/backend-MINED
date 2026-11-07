import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectorPrioridad } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ConfigurarPrioridadDto {
  @ApiProperty({ example: 'uuid-del-periodo', format: 'uuid' })
  @IsUUID()
  periodoId: string;

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
}
