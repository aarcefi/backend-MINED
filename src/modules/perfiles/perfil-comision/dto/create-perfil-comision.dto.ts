import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePerfilComisionDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty()
  @IsString()
  apellidos: string;

  @ApiProperty()
  @IsString()
  carnetIdentidad: string;

  @ApiProperty()
  @IsString()
  municipio: string;

  @ApiProperty()
  @IsString()
  cargo: string;
}
