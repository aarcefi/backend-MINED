import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CapacidadAnioDto } from './capacidad-anio.dto';

/** Capacidad de cada año de vida del círculo; un año ausente o con 0 se quita. */
export class ActualizarCapacidadesDto {
  @ApiProperty({
    type: [CapacidadAnioDto],
    example: [
      { anioVida: 'ANIO_2', capacidadTotal: 20 },
      { anioVida: 'ANIO_3', capacidadTotal: 25 },
    ],
  })
  @IsArray({ message: 'Las capacidades deben ser una lista' })
  @ArrayMaxSize(6, { message: 'Hay como máximo 6 años de vida' })
  @ValidateNested({ each: true })
  @Type(() => CapacidadAnioDto)
  capacidades: CapacidadAnioDto[];
}
