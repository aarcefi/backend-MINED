import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  Length,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCirculo } from '../../../common/enums';
import { CapacidadAnioDto } from './capacidad-anio.dto';

export class CreateCirculoInfantilDto {
  @ApiProperty()
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  nombre: string;

  @ApiProperty()
  @IsString({ message: 'La dirección es obligatoria' })
  @Length(1, 200, { message: 'La dirección es obligatoria' })
  direccion: string;

  @ApiProperty()
  @IsString({ message: 'El municipio es obligatorio' })
  @Length(1, 100, { message: 'El municipio es obligatorio' })
  municipio: string;

  @ApiProperty()
  @IsString({ message: 'La provincia es obligatoria' })
  @Length(1, 100, { message: 'La provincia es obligatoria' })
  provincia: string;

  @ApiProperty()
  @IsInt({ message: 'La capacidad total debe ser un número entero' })
  @Min(1, { message: 'La capacidad total debe ser al menos 1' })
  @Max(500, { message: 'La capacidad total no puede superar 500' })
  capacidadTotal: number;

  @ApiProperty({ enum: TipoCirculo })
  @IsEnum(TipoCirculo, { message: 'El tipo de círculo no es válido' })
  tipo: TipoCirculo;

  @ApiProperty()
  @IsBoolean()
  activo: boolean;

  @ApiProperty()
  @IsBoolean()
  tieneSextoAnio: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 30, { message: 'El teléfono no puede superar 30 caracteres' })
  telefono?: string | null;

  @ApiPropertyOptional({
    type: [CapacidadAnioDto],
    description:
      'Capacidad por año de vida. Si se envía, es la lista completa: los años que falten (o con 0) se quitan',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacidadAnioDto)
  capacidades?: CapacidadAnioDto[];
}
