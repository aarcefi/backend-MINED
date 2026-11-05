import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsDateString } from 'class-validator';

export class CreatePeriodoDto {
  @ApiProperty({ example: 'Período 2026-2027' })
  @IsString({ message: 'El nombre del período es obligatorio' })
  @Length(2, 100, {
    message: 'El nombre del período debe tener entre 2 y 100 caracteres',
  })
  nombre: string;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  fechaInicio: string;

  @ApiProperty({ example: '2026-11-30' })
  @IsDateString({}, { message: 'La fecha de cierre no es válida' })
  fechaCierre: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString({}, { message: 'La fecha de asignación no es válida' })
  fechaAsignacion: string;
}
