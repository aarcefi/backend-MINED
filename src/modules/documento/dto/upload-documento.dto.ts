import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { TipoDocumento } from '../../../common/enums';

export class UploadDocumentoDto {
  @ApiProperty()
  @IsUUID()
  solicitudId: string;

  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;
}
