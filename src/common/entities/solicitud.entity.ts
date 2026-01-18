import { SectorPrioridad, TipoSolicitud, EstadoSolicitud } from '../enums';
import { Nino } from './nino.entity';
import { Tutor } from './tutor.entity';
import { PeriodoOtorgamiento } from './periodo-otorgamiento.entity';
import { DocumentoSolicitud } from './documento-solicitud.entity';
import { DecisionSolicitud } from './decision-solicitud.entity';
import { Matricula } from './matricula.entity';
import { Trazabilidad } from './trazabilidad.entity';

export class Solicitud {
  id: string;
  ninoId: string;
  tutorId: string;
  fechaSolicitud: Date;
  sector: SectorPrioridad;
  tipoSolicitud: TipoSolicitud;
  estado: EstadoSolicitud;
  periodoId: string;
  numeroRegistro: string;
  observaciones?: string;

  nino?: Nino;
  tutor?: Tutor;
  periodo?: PeriodoOtorgamiento;
  documentos?: DocumentoSolicitud[];
  decisiones?: DecisionSolicitud[];
  matricula?: Matricula;
  trazas?: Trazabilidad[];
}
