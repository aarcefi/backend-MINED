import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsBoolean } from 'class-validator';

export class CreateComisionDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  municipio: string;

  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}
