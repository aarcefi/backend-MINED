import { CirculosInfantiles } from './circulos-infantiles.entity';
import { PeriodoOtorgamiento } from './periodo-otorgamiento.entity';

export class CapacidadesCirculos {
  id: string;
  idCirculo: string;
  idPeriodo: string;
  cuposDisponibles: number;
  cuposOcupados: number;

  circulo?: CirculosInfantiles;
  periodo?: PeriodoOtorgamiento;
}
