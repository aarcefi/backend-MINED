import { IEvent } from '../../../common/events/event.interface';

export class MatriculaCreadaEvent implements IEvent {
  public readonly name = 'matricula.creada';

  constructor(
    public readonly data: {
      matriculaId: string;
      folio: string;
      usuarioId: string;
      email: string;
      nombre: string;
      circuloNombre: string;
      fechaOtorgamiento: Date;
      fechaLimite: Date;
    },
  ) {}
}
