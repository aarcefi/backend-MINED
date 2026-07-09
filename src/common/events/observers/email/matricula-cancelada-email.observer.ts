/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { IObserver } from '../../observer.interface';
import { IEvent } from '../../event.interface';
import { MailService } from '../../../../mail/mail.service';

@Injectable()
export class MatriculaCanceladaEmailObserver implements IObserver {
  constructor(private mailService: MailService) {}

  async handle(event: IEvent): Promise<void> {
    if (event.name !== 'matricula.cancelada') return;

    const { email, nombre, circuloNombre, folio, motivo } = event.data;
    const subject = 'Matrícula cancelada';
    const text = `Hola ${nombre},\n\nLa matrícula para el círculo infantil "${circuloNombre}" con folio ${folio} ha sido cancelada${motivo === 'vencida' ? ' porque no fue activada dentro del plazo establecido.' : '.'}\n\nSi tienes dudas, comunícate con la administración.\n\nSaludos cordiales.`;

    await this.mailService.sendCustomEmail(email, subject, text);
  }
}
