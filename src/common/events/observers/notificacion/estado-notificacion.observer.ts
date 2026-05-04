/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { NotificacionesService } from '../../../../modules/notificacion/notificaciones.service';

@Injectable()
export class NotificacionObserver implements IObserver {
  constructor(private notificacionesService: NotificacionesService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'solicitud.estado.cambiado') return;

    const {
      nombreSolicitante,
      ninoNombre,
      ninoApellidos,
      estadoAnterior,
      estadoNuevo,
      comentario,
    } = event.data;

    const nombreCompletoNino = `${ninoNombre} ${ninoApellidos}`;
    let mensaje = `Hola ${nombreSolicitante}, la solicitud de ${nombreCompletoNino} cambió de estado: ${estadoAnterior} → ${estadoNuevo}.`;
    if (comentario) {
      mensaje += ` Comentario: ${comentario}`;
    }

    await this.notificacionesService.createForUsuario(
      event.data.usuarioId,
      'Cambio de estado en tu solicitud',
      mensaje,
      'estado_solicitud',
    );
  }
}
