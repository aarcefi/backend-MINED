import { IEvent } from '../../../common/events/event.interface';

export class MatriculaPendienteActivacionEvent implements IEvent {
  public readonly name = 'matricula.pendiente.activacion';

  constructor(
    public readonly data: {
      matriculaId: string;
      folio: string;
      circuloNombre: string;
      directorId: string;
      directorEmail: string;
      directorNombre: string;
      fechaOtorgamiento: Date;
      fechaLimite: Date;
    },
  ) {}
}
