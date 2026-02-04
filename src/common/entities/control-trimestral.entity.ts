import { VinculoLaboral } from '@prisma/client';
import { Matricula } from './matricula.entity';
import { PerfilFuncionario } from './perfil-funcionario.entity';

export class ControlTrimestral {
  id: string;
  matriculaId: string;
  fecha: Date;
  vinculo: VinculoLaboral;
  observaciones?: string;
  funcionarioId: string;

  matricula?: Matricula;
  funcionario?: PerfilFuncionario;
}
