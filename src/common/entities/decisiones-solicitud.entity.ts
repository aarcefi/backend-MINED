import { ResultadoDecision } from '@prisma/client';
import { Solicitud } from './solicitud.entity';
import { SesionComision } from './sesion-comision.entity';
import { PerfilComision } from './perfil-comision.entity';

export class DecisionesSolicitud {
  id: string;
  solicitudId: string;
  sesionId: string;
  comisionId: string;
  resultado: ResultadoDecision;
  puntuacion: number;
  observaciones?: string;

  solicitud?: Solicitud;
  sesion?: SesionComision;
  comision?: PerfilComision;
}
