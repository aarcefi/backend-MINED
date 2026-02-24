import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePerfilFuncionarioDto {
  @ApiProperty({ example: 'Especialista de Educación' })
  @IsString()
  cargo: string;
}
