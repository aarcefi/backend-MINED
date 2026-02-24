import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePerfilDirectorDto {
  @ApiProperty({
    description: 'ID del círculo infantil al que se asigna el director',
    example: 'd4d4d4d4-d4d4-4d4d-d4d4-d4d4d4d4d4d4',
  })
  @IsUUID()
  circuloId: string;
}
