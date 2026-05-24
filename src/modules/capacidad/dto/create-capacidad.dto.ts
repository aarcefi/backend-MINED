import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { AnioVida } from 'src/common';

export class CreateCapacidadDto {
  @ApiProperty()
  @IsUUID()
  circuloId: string;

  @ApiProperty()
  @IsUUID()
  periodoId: string;

  @ApiProperty({ enum: AnioVida })
  @IsEnum(AnioVida)
  anioVida: AnioVida;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposDisponibles: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposOcupados: number;
}
