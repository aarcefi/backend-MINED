import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSesionDto {
  @ApiProperty()
  @IsUUID()
  comisionId: string;

  @ApiProperty()
  @IsUUID()
  periodoId: string;

  @ApiProperty()
  @IsDateString()
  fecha: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actaUrl?: string;
}
