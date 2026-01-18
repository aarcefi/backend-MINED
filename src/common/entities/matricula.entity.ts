import { EstadoMatricula } from '../enums';
import { Solicitud } from './solicitud.entity';
import { CirculoInfantil } from './circulo-infantil.entity';
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
  circulo?: CirculoInfantil;
  controles?: ControlTrimestral[];
}
