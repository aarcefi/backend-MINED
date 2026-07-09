import { IEvent } from '../../../common/events/event.interface';

export class MatriculaCanceladaEvent implements IEvent {
  public readonly name = 'matricula.cancelada';

  constructor(
    public readonly data: {
      matriculaId: string;
      folio: string;
      usuarioId: string;
      email: string;
      nombre: string;
      circuloNombre: string;
      motivo: 'vencida' | 'manual'; // indica la causa
    },
  ) {}
}
