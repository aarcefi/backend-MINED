import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificacionDto {
  @ApiProperty()
  @IsUUID()
  usuarioId: string;

  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiProperty()
  @IsString()
  mensaje: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  leida?: boolean = false;

  @ApiProperty({ example: 'estado_solicitud' })
  @IsString()
  tipo: string;
}
