import { ResultadoDecision } from '../enums';
import { Solicitud } from './solicitud.entity';
import { SesionComision } from './sesion-comision.entity';

export class DecisionSolicitud {
  id: string;
  solicitudId: string;
  sesionId: string;
  resultado: ResultadoDecision;
  puntuacion: number;
  observaciones?: string;

  solicitud?: Solicitud;
  sesion?: SesionComision;
}
