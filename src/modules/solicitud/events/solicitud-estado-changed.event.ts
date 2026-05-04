import { IEvent } from '../../../common/events/event.interface';

export class SolicitudEstadoChangedEvent implements IEvent {
  public readonly name = 'solicitud.estado.cambiado';

  constructor(
    public readonly data: {
      solicitudId: string;
      usuarioId: string;
      email: string;
      nombreSolicitante: string;
      ninoNombre: string;
      ninoApellidos: string;
      estadoAnterior: string;
      estadoNuevo: string;
      comentario?: string;
    },
  ) {}
}
