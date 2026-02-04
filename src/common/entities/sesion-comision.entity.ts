import { Comision } from './comision.entity';
import { PeriodoOtorgamiento } from './periodo-otorgamiento.entity';
import { DecisionesSolicitud } from './decisiones-solicitud.entity';

export class SesionComision {
  id: string;
  comisionId: string;
  periodoId: string;
  fecha: Date;
  actaUrl?: string;

  comision?: Comision;
  periodo?: PeriodoOtorgamiento;
  decisiones?: DecisionesSolicitud[];
}
