import { Solicitud } from './solicitud.entity';
import { CapacidadCirculo } from './capacidad-circulo.entity';
import { SesionComision } from './sesion-comision.entity';

export class PeriodoOtorgamiento {
  id: string;
  nombre: string;
  fechaInicio: Date;
  fechaCierre: Date;
  fechaAsignacion: Date;

  solicitudes?: Solicitud[];
  capacidades?: CapacidadCirculo[];
  sesiones?: SesionComision[];
}
