import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEstadoTrasladoDto {
  @ApiProperty({ enum: ['APROBADA', 'RECHAZADA', 'EN_ESPERA'] })
  @IsIn(['APROBADA', 'RECHAZADA', 'EN_ESPERA'])
  estado: 'APROBADA' | 'RECHAZADA' | 'EN_ESPERA';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentarioRespuesta?: string;
}
