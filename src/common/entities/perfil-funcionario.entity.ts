import { Usuario } from './usuario.entity';
import { DocumentoSolicitud } from './documento-solicitud.entity';
import { ControlTrimestral } from './control-trimestral.entity';
import { Trazabilidad } from './trazabilidad.entity';

export class PerfilFuncionario {
  id: string;
  usuarioId: string;
  nombre: string;
  apellidos: string;
  carnetIdentidad: string;
  telefono?: string;
  cargo: string;
  municipio: string;

  usuario?: Usuario;
  documentosVal?: DocumentoSolicitud[];
  controles?: ControlTrimestral[];
  trazas?: Trazabilidad[];
}
