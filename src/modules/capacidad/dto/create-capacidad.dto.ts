import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { AnioVida } from '@prisma/client';

export class CreateCapacidadDto {
  @ApiProperty()
  @IsUUID()
  circuloId: string;

  @ApiProperty({ enum: AnioVida })
  @IsEnum(AnioVida)
  anioVida: AnioVida;

  @ApiProperty({
    description: 'Capacidad total (nominal) para este año de vida',
    example: 20,
  })
  @IsInt()
  @Min(0)
  capacidadTotal: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposDisponibles: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposOcupados: number;
}