import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class AddEnumValueDto {
  @ApiProperty({
    description: 'Nuevo valor para el enum',
    example: 'NUEVO_VALOR',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'El valor no puede estar vacío' })
  @IsString({ message: 'El valor debe ser un texto' })
  @MinLength(1, { message: 'El valor debe tener al menos 1 caracter' })
  @MaxLength(50, { message: 'El valor no puede exceder los 50 caracteres' })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'El valor solo puede contener letras, números y guiones bajos',
  })
  value: string;
}

export class UpdateEnumValueDto {
  @ApiProperty({
    description: 'Nuevo valor para reemplazar el existente',
    example: 'VALOR_ACTUALIZADO',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'El nuevo valor no puede estar vacío' })
  @IsString({ message: 'El nuevo valor debe ser un texto' })
  @MinLength(1, { message: 'El nuevo valor debe tener al menos 1 caracter' })
  @MaxLength(50, {
    message: 'El nuevo valor no puede exceder los 50 caracteres',
  })
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'El valor solo puede contener letras, números y guiones bajos',
  })
  newValue: string;
}
