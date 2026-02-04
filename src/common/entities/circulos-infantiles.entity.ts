import { TipoCirculo } from '../enums';
import { CapacidadesCirculos } from './capacidades-circulos.entity';
import { Matricula } from './matricula.entity';

export class CirculosInfantiles {
  id: string;
  nombre: string;
  direccion: string;
  municipio: string;
  capacidadTotal: number;
  tipo: TipoCirculo;
  activo: boolean;

  capacidades?: CapacidadesCirculos[];
  matriculas?: Matricula[];
}
