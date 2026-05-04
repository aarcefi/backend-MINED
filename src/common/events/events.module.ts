import { Module, Global } from '@nestjs/common';
import { EventDispatcher } from './event-dispatcher.service';
import { NotificacionObserver } from './observers/notificacion/estado-notificacion.observer';
import { EmailObserver } from './observers/email/estado-email.observer';
import { MatriculaNotificacionObserver } from './observers/notificacion/matricula-notificacion.observer';
import { MatriculaEmailObserver } from './observers/email/matricula-email.observer';
import { NotificacionesModule } from '../../modules';
import { MailModule } from '../../mail/mail.module';

@Global()
@Module({
  imports: [NotificacionesModule, MailModule],
  providers: [
    EventDispatcher,
    NotificacionObserver,
    EmailObserver,
    MatriculaNotificacionObserver,
    MatriculaEmailObserver,
  ],
  exports: [EventDispatcher],
})
export class EventsModule {
  constructor(
    private eventDispatcher: EventDispatcher,
    private notificacionObserver: NotificacionObserver,
    private emailObserver: EmailObserver,
    private matriculaNotificacionObserver: MatriculaNotificacionObserver,
    private matriculaEmailObserver: MatriculaEmailObserver,
  ) {
    // Registrar observadores de solicitud
    this.eventDispatcher.register(
      'solicitud.estado.cambiado',
      this.notificacionObserver,
    );
    this.eventDispatcher.register(
      'solicitud.estado.cambiado',
      this.emailObserver,
    );
    // Registrar observadores de matrícula
    this.eventDispatcher.register(
      'matricula.creada',
      this.matriculaNotificacionObserver,
    );
    this.eventDispatcher.register(
      'matricula.creada',
      this.matriculaEmailObserver,
    );
  }
}
