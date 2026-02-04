import {
  SectorPrioridad,
  TipoSolicitud,
  EstadoSolicitud,
} from '@prisma/client';
import { Nino } from './nino.entity';
import { PerfilSolicitante } from './perfil-solicitante.entity';
import { PeriodoOtorgamiento } from './periodo-otorgamiento.entity';
import { DocumentoSolicitud } from './documento-solicitud.entity';
import { DecisionesSolicitud } from './decisiones-solicitud.entity';
import { Matricula } from './matricula.entity';
import { Trazabilidad } from './trazabilidad.entity';

export class Solicitud {
  id: string;
  ninoId: string;
  solicitanteId: string; // CAMBIADO: tutorId → solicitanteId
  fechaSolicitud: Date;
  sector: SectorPrioridad;
  tipoSolicitud: TipoSolicitud;
  estado: EstadoSolicitud;
  periodoId: string;
  numeroRegistro: string;
  observaciones?: string;
  prioridad: number;

  nino?: Nino;
  solicitante?: PerfilSolicitante;
  periodo?: PeriodoOtorgamiento;
  documentos?: DocumentoSolicitud[];
  decisiones?: DecisionesSolicitud[];
  matricula?: Matricula;
  trazas?: Trazabilidad[];
}
