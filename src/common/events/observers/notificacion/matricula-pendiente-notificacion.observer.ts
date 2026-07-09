/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { NotificacionesService } from '../../../../modules/notificacion/notificaciones.service';

@Injectable()
export class MatriculaPendienteNotificacionObserver implements IObserver {
  constructor(private notificacionesService: NotificacionesService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.pendiente.activacion') return;

    const { directorId, directorNombre, folio, circuloNombre } = event.data;
    const titulo = 'Nueva matrícula pendiente de activación';
    const mensaje = `Hola ${directorNombre}, se ha creado una nueva matrícula con folio ${folio} para el círculo "${circuloNombre}".`;

    await this.notificacionesService.createForUsuario(
      directorId,
      titulo,
      mensaje,
      'MATRICULA',
    );
  }
}
