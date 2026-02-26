import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPersona } from '@prisma/client';

export class DatosSolicitanteDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'González Pérez' })
  @IsString()
  apellidos: string;

  @ApiProperty({ example: '85010112345' })
  @IsString()
  carnetIdentidad: string;

  @ApiPropertyOptional({ example: '+5351234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'Calle 10 #123 e/ 1ra y 3ra, Vedado' })
  @IsString()
  direccion: string;

  @ApiProperty({ example: 'Plaza de la Revolución' })
  @IsString()
  municipio: string;

  @ApiProperty({ example: 'La Habana' })
  @IsString()
  provincia: string;

  @ApiProperty({ enum: TipoPersona })
  @IsEnum(TipoPersona)
  tipoPersona: TipoPersona;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  cantHijos?: number = 1;

  @ApiProperty({ example: 'Hospital Salvador Allende' })
  @IsString()
  centroTrabajo: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'contraseñaSegura123',
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ type: DatosSolicitanteDto })
  @ValidateNested()
  @Type(() => DatosSolicitanteDto)
  datosSolicitante: DatosSolicitanteDto;
}
