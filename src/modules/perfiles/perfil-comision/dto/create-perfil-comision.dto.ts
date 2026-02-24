import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePerfilComisionDto {
  @ApiProperty({ example: 'Miembro de Comisión' })
  @IsString()
  cargo: string;
}
