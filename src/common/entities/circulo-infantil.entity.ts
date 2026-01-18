import { TipoCirculo } from '../enums';
import { CapacidadCirculo } from './capacidad-circulo.entity';
import { Matricula } from './matricula.entity';

export class CirculoInfantil {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  capacidadTotal: number;
  tipo: TipoCirculo;
  activo: boolean;

  capacidades?: CapacidadCirculo[];
  matriculas?: Matricula[];
}
