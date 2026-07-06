import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTrasladoDto {
  @ApiProperty()
  @IsUUID()
  matriculaId: string;

  @ApiProperty()
  @IsUUID()
  circuloDestinoId: string;

  @ApiProperty({ minLength: 5, maxLength: 500 })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivo: string;
}
