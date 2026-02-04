import { Solicitud } from './solicitud.entity';
import { CapacidadesCirculos } from './capacidades-circulos.entity';
import { SesionComision } from './sesion-comision.entity';

export class PeriodoOtorgamiento {
  id: string;
  nombre: string;
  fechaInicio: Date;
  fechaCierre: Date;
  fechaAsignacion: Date;

  solicitudes?: Solicitud[];
  capacidades?: CapacidadesCirculos[];
  sesiones?: SesionComision[];
}
