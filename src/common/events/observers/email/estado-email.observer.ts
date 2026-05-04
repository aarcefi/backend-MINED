/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { MailService } from '../../../../mail/mail.service';

@Injectable()
export class EmailObserver implements IObserver {
  constructor(private mailService: MailService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'solicitud.estado.cambiado') return;
    try {
      const {
        email,
        nombreSolicitante,
        ninoNombre,
        ninoApellidos,
        estadoAnterior,
        estadoNuevo,
        comentario,
      } = event.data;
      const subject = `Actualización de solicitud para ${ninoNombre} ${ninoApellidos}`;
      const text = `Hola ${nombreSolicitante},\n\nLa solicitud para ${ninoNombre} ${ninoApellidos} ha cambiado de estado: ${estadoAnterior} → ${estadoNuevo}.${comentario ? `\nComentario: ${comentario}` : ''}\n\nPara más detalles, ingresa al sistema.\n\nSaludos cordiales.`;
      await this.mailService.sendCustomEmail(email, subject, text);
    } catch (error) {
      console.error('Error enviando correo electrónico:', error);
    }
  }
}
