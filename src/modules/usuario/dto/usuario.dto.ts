import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class UsuarioDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: RolUsuario })
  rol: RolUsuario;

  @ApiProperty()
  activo: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  perfilSolicitante?: any;

  @ApiProperty({ required: false })
  perfilFuncionario?: any;

  @ApiProperty({ required: false })
  perfilComision?: any;
}
