import { VinculoLaboral } from '../enums';
import { Matricula } from './matricula.entity';
import { Tutor } from './tutor.entity';

export class ControlTrimestral {
  id: string;
  matriculaId: string;
  fecha: Date;
  vinculo: VinculoLaboral;
  observaciones?: string;
  funcionarioId: string;

  matricula?: Matricula;
  funcionario?: Tutor;
}
