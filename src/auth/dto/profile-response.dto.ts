import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class ProfileResponseDto {
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

  @ApiPropertyOptional({
    description:
      'Perfil del funcionario (solo si rol es FUNCIONARIO_MUNICIPAL)',
    example: {
      nombre: 'Juan',
      apellidos: 'Martínez López',
      carnetIdentidad: '85010112345',
      telefono: '+5351234567',
      cargo: 'Especialista de Educación',
      municipio: 'Plaza de la Revolución',
      provincia: 'La Habana',
    },
  })
  perfilFuncionario?: any;

  @ApiPropertyOptional({
    description: 'Perfil de la comisión (solo si rol es COMISION_OTORGAMIENTO)',
    example: {
      nombre: 'Carlos',
      apellidos: 'Rodríguez Fernández',
      carnetIdentidad: '85010112345',
      municipio: 'Plaza de la Revolución',
      provincia: 'La Habana',
      cargo: 'Miembro de Comisión',
    },
  })
  perfilComision?: any;

  @ApiPropertyOptional({
    description:
      'Perfil del director de círculo (solo si rol es DIRECTOR_CIRCULO)',
    example: {
      nombre: 'Roberto',
      apellidos: 'García Torres',
      carnetIdentidad: '94010122334',
      telefono: '+5352233445',
      municipio: 'Plaza de la Revolución',
      provincia: 'La Habana',
      circulo: {
        id: 'd4d4d4d4-d4d4-4d4d-d4d4-d4d4d4d4d4d4',
        nombre: 'Círculo Infantil "Amiguitos"',
      },
    },
  })
  perfilDirector?: {
    nombre: string;
    apellidos: string;
    carnetIdentidad: string;
    telefono?: string;
    municipio: string;
    provincia: string;
    circulo: {
      id: string;
      nombre: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Notificaciones del usuario (solo en getProfile)',
    example: [
      {
        id: '789e4567-e89b-12d3-a456-426614174000',
        titulo: 'Nueva notificación',
        mensaje: 'Tienes una nueva solicitud',
        leida: false,
        fecha: '2023-10-01T12:00:00.000Z',
      },
    ],
  })
  notificaciones?: any[];
}
