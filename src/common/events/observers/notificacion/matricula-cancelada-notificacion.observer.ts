/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { NotificacionesService } from '../../../../modules/notificacion/notificaciones.service';

@Injectable()
export class MatriculaCanceladaNotificacionObserver implements IObserver {
  constructor(private notificacionesService: NotificacionesService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.cancelada') return;

    const { nombre, circuloNombre, folio, motivo } = event.data;
    const mensaje = `Hola ${nombre}, la matrícula para el círculo "${circuloNombre}" con folio ${folio} ha sido cancelada${motivo === 'vencida' ? ' por no haber sido activada dentro del plazo establecido' : ''}. Si tienes dudas, contacta con la administración.`;

    await this.notificacionesService.createForUsuario(
      event.data.usuarioId,
      'Matrícula cancelada',
      mensaje,
      'MATRICULA',
    );
  }
}
