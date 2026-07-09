/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { MailService } from '../../../../mail/mail.service';

@Injectable()
export class MatriculaPendienteEmailObserver implements IObserver {
  constructor(private mailService: MailService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.pendiente.activacion') return;

    const { directorEmail, directorNombre, folio, circuloNombre } = event.data;
    const subject = 'Nueva matrícula pendiente de activación';
    const text = `Hola ${directorNombre},\n\nSe ha creado una nueva matrícula con folio ${folio} para el círculo infantil "${circuloNombre}".\n\nSaludos cordiales.`;

    try {
      await this.mailService.sendCustomEmail(directorEmail, subject, text);
    } catch (error) {
      // El error ya se maneja en el servicio de mail, pero podemos loguear
      console.error('Error enviando correo al director:', error.message);
    }
  }
}
