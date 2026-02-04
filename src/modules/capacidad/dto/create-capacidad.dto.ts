import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class CreateCapacidadDto {
  @ApiProperty()
  @IsUUID()
  circuloId: string;

  @ApiProperty()
  @IsUUID()
  periodoId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposDisponibles: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  cuposOcupados: number;
}
