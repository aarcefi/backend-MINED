import { Module, Global } from '@nestjs/common';
import { EventDispatcher } from './event-dispatcher.service';
import { NotificacionObserver } from './observers/notificacion/estado-notificacion.observer';
import { EmailObserver } from './observers/email/estado-email.observer';
import { MatriculaNotificacionObserver } from './observers/notificacion/matricula-notificacion.observer';
import { MatriculaEmailObserver } from './observers/email/matricula-email.observer';
import { MatriculaCanceladaNotificacionObserver } from './observers/notificacion/matricula-cancelada-notificacion.observer';
import { MatriculaCanceladaEmailObserver } from './observers/email/matricula-cancelada-email.observer';
import { MatriculaPendienteNotificacionObserver } from './observers/notificacion/matricula-pendiente-notificacion.observer';
import { MatriculaPendienteEmailObserver } from './observers/email/matricula-pendiente-email.observer';
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
    MatriculaCanceladaNotificacionObserver,
    MatriculaCanceladaEmailObserver,
    MatriculaPendienteNotificacionObserver,
    MatriculaPendienteEmailObserver,
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
    private matriculaCanceladaNotificacionObserver: MatriculaCanceladaNotificacionObserver,
    private matriculaCanceladaEmailObserver: MatriculaCanceladaEmailObserver,
    private matriculaPendienteNotificacionObserver: MatriculaPendienteNotificacionObserver,
    private matriculaPendienteEmailObserver: MatriculaPendienteEmailObserver,
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

    // Registrar observadores de matrícula creada (para solicitante)
    this.eventDispatcher.register(
      'matricula.creada',
      this.matriculaNotificacionObserver,
    );
    this.eventDispatcher.register(
      'matricula.creada',
      this.matriculaEmailObserver,
    );

    // Registrar observadores de matrícula cancelada
    this.eventDispatcher.register(
      'matricula.cancelada',
      this.matriculaCanceladaNotificacionObserver,
    );
    this.eventDispatcher.register(
      'matricula.cancelada',
      this.matriculaCanceladaEmailObserver,
    );

    // Registrar observadores de matrícula pendiente de activación (para director)
    this.eventDispatcher.register(
      'matricula.pendiente.activacion',
      this.matriculaPendienteNotificacionObserver,
    );
    this.eventDispatcher.register(
      'matricula.pendiente.activacion',
      this.matriculaPendienteEmailObserver,
    );
  }
}
