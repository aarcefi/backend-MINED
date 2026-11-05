import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { AnioVida } from '@prisma/client';

/** Capacidad nominal de un año de vida, tal como la edita el administrador. */
export class CapacidadAnioDto {
  @ApiProperty({ enum: AnioVida })
  @IsEnum(AnioVida, { message: 'El año de vida no es válido' })
  anioVida: AnioVida;

  @ApiProperty({ example: 20, description: '0 quita el año del círculo' })
  @IsInt({ message: 'La capacidad por año debe ser un número entero' })
  @Min(0, { message: 'La capacidad por año no puede ser negativa' })
  @Max(500, { message: 'La capacidad por año no puede superar 500' })
  capacidadTotal: number;
}
