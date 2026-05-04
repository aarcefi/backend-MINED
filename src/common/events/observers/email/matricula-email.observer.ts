/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { MailService } from '../../../../mail/mail.service';

@Injectable()
export class MatriculaEmailObserver implements IObserver {
  constructor(private mailService: MailService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.creada') return;

    const {
      email,
      nombre,
      circuloNombre,
      folio,
      fechaOtorgamiento,
      fechaLimite,
    } = event.data;
    const subject = '¡Matrícula otorgada!';
    const text = `Hola ${nombre},\n\nSe ha otorgado una matrícula para el círculo infantil "${circuloNombre}" bajo el folio ${folio}.\n\nFecha de otorgamiento: ${fechaOtorgamiento.toLocaleDateString()}\nFecha límite: ${fechaLimite.toLocaleDateString()}\n\nPor favor, presenta los documentos requeridos antes de la fecha límite.\n\nSaludos cordiales.`;
    await this.mailService.sendCustomEmail(email, subject, text);
  }
}
