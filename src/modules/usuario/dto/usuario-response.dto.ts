import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class UsuarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: RolUsuario })
  rol: RolUsuario;

  @ApiProperty()
  activo: boolean;

  @ApiPropertyOptional({
    description: 'Perfil del solicitante (solo si rol es SOLICITANTE)',
  })
  perfilSolicitante?: any;

  @ApiPropertyOptional({
    description:
      'Perfil del funcionario (solo si rol es FUNCIONARIO_MUNICIPAL)',
  })
  perfilFuncionario?: any;

  @ApiPropertyOptional({
    description: 'Perfil de la comisión (solo si rol es COMISION_OTORGAMIENTO)',
  })
  perfilComision?: any;

  @ApiPropertyOptional({
    description:
      'Perfil del director de círculo (solo si rol es DIRECTOR_CIRCULO)',
  })
  perfilDirector?: any;
}
