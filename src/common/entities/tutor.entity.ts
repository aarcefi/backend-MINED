import { TipoPersona } from '../enums';
import { Nino } from './nino.entity';
import { Solicitud } from './solicitud.entity';
import { DocumentoSolicitud } from './documento-solicitud.entity';
import { Trazabilidad } from './trazabilidad.entity';
import { ControlTrimestral } from './control-trimestral.entity';

export class Tutor {
  id: string;
  nombre: string;
  apellidos: string;
  carnetIdentidad: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipoPersona: TipoPersona;
  activo: boolean;
  cantHijo: number;

  hijos?: Nino[];
  solicitudes?: Solicitud[];
  documentosVal?: DocumentoSolicitud[];
  trazas?: Trazabilidad[];
  controles?: ControlTrimestral[];
}
