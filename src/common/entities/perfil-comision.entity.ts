import { Usuario } from './usuario.entity';
import { DecisionesSolicitud } from './decisiones-solicitud.entity';

export class PerfilComision {
  id: string;
  usuarioId: string;
  nombre: string;
  apellidos: string;
  carnetIdentidad: string;
  municipio: string;
  cargo: string;

  usuario?: Usuario;
  decisiones?: DecisionesSolicitud[];
}
