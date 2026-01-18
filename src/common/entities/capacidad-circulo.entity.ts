import { CirculoInfantil } from './circulo-infantil.entity';
import { PeriodoOtorgamiento } from './periodo-otorgamiento.entity';

export class CapacidadCirculo {
  id: string;
  idCirculo: string;
  idPeriodo: string;
  cuposDisponibles: number;
  cuposOcupados: number;

  circulo?: CirculoInfantil;
  periodo?: PeriodoOtorgamiento;
}
