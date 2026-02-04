import { EstadoMatricula } from '../enums';
import { Solicitud } from './solicitud.entity';
import { CirculosInfantiles } from './circulos-infantiles.entity';
import { ControlTrimestral } from './control-trimestral.entity';

export class Matricula {
  id: string;
  solicitudId: string;
  circuloId: string;
  fechaOtorgamiento: Date;
  fechaLimite: Date;
  estado: EstadoMatricula;
  boletaUrl?: string;

  solicitud?: Solicitud;
  circulo?: CirculosInfantiles;
  controles?: ControlTrimestral[];
}
