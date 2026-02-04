import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { TipoDocumento } from '../../../common/enums';

export class CreateDocumentoDto {
  @ApiProperty()
  @IsUUID()
  solicitudId: string;

  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @ApiProperty()
  @IsString()
  archivoUrl: string;

  @ApiProperty()
  @IsString()
  nombreArchivo: string;

  @ApiProperty()
  @IsBoolean()
  validado: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fechaValidacion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  validadorId?: string;
}
