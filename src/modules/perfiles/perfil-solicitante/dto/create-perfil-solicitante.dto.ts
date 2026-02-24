import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { TipoPersona } from '@prisma/client';

export class CreatePerfilSolicitanteDto {
  @ApiProperty({ enum: TipoPersona, example: TipoPersona.MADRE })
  @IsEnum(TipoPersona)
  tipoPersona: TipoPersona;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cantHijos?: number = 1;

  @ApiProperty({ example: 'Calle 10 #123 e/ 1ra y 3ra, Vedado' })
  @IsString()
  direccion: string;
}
