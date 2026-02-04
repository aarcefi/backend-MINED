import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
  Length,
} from 'class-validator';
import { TipoCirculo } from '../../../common/enums';

export class CreateCirculoInfantilDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  nombre: string;

  @ApiProperty()
  @IsString()
  direccion: string;

  @ApiProperty()
  @IsString()
  municipio: string;

  @ApiProperty()
  @IsString()
  provincia: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacidadTotal: number;

  @ApiProperty({ enum: TipoCirculo })
  @IsEnum(TipoCirculo)
  tipo: TipoCirculo;

  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}
