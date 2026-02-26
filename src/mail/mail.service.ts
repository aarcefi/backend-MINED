/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: false, // true para 465
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, code: string) {
    const mailOptions = {
      from: '"Sistema de Otorgamiento" <no-reply@otorgamiento.com>',
      to,
      subject: 'Restablecimiento de contraseña',
      text: `Tu código para restablecer la contraseña es: ${code}. Este código expirará en 15 minutos.`,
      html: `<p>Tu código para restablecer la contraseña es: <strong>${code}</strong></p><p>Este código expirará en 15 minutos.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(to: string, name: string) {
    const mailOptions = {
      from: '"Sistema de Otorgamiento" <no-reply@otorgamiento.com>',
      to,
      subject: 'Bienvenido al Sistema de Otorgamiento',
      html: `
        <h1>¡Bienvenido, ${name}!</h1>
        <p>Tu cuenta ha sido creada exitosamente.</p>
        <p>Ya puedes iniciar sesión en el sistema.</p>
      `,
    };
    await this.transporter.sendMail(mailOptions);
  }
}
