import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class RegisterResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  email: string;

  @ApiProperty({ enum: RolUsuario, example: RolUsuario.SOLICITANTE })
  rol: RolUsuario;

  @ApiPropertyOptional({
    description: 'Perfil del solicitante (solo si rol es SOLICITANTE)',
    example: {
      nombre: 'María',
      apellidos: 'González Pérez',
      carnetIdentidad: '85010112345',
      telefono: '+5351234567',
      direccion: 'Calle 10 #123 e/ 1ra y 3ra, Vedado',
      municipio: 'Plaza de la Revolución',
      provincia: 'La Habana',
      tipoPersona: 'MADRE',
      cantHijos: 2,
    },
  })
  perfilSolicitante?: any;
}
