import { SesionComision } from './sesion-comision.entity';

export class Comision {
  id: string;
  municipio: string;
  activo: boolean;

  sesiones?: SesionComision[];
}
