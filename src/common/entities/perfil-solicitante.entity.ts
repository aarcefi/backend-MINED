import { TipoPersona } from '@prisma/client';
import { Usuario } from './usuario.entity';
import { Nino } from './nino.entity';
import { Solicitud } from './solicitud.entity';

export class PerfilSolicitante {
  id: string;
  usuarioId: string;
  nombre: string;
  apellidos: string;
  carnetIdentidad: string;
  telefono?: string;
  direccion: string;
  municipio: string;
  tipoPersona: TipoPersona;
  cantHijos: number;

  usuario?: Usuario;
  hijos?: Nino[];
  solicitudes?: Solicitud[];
}
