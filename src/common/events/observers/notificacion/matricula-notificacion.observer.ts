/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { NotificacionesService } from '../../../../modules/notificacion/notificaciones.service';

@Injectable()
export class MatriculaNotificacionObserver implements IObserver {
  constructor(private notificacionesService: NotificacionesService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.creada') return;

    const { nombre, circuloNombre, fechaOtorgamiento, fechaLimite, folio } =
      event.data;
    const mensaje = `Hola ${nombre}, se ha otorgado una matrícula para el círculo "${circuloNombre}" con folio ${folio}. Fecha de otorgamiento: ${fechaOtorgamiento.toLocaleDateString()}, fecha límite: ${fechaLimite.toLocaleDateString()}.`;
    await this.notificacionesService.createForUsuario(
      event.data.usuarioId,
      '¡Matrícula otorgada!',
      mensaje,
      'matricula',
    );
  }
}
