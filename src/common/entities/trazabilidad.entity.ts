import { Solicitud } from './solicitud.entity';
import { Tutor } from './tutor.entity';

export class Trazabilidad {
  id: string;
  solicitudId: string;
  estadoAnterior: string;
  estadoNuevo: string;
  fecha: Date;
  usuarioId: string;
  comentario?: string;

  solicitud?: Solicitud;
  usuario?: Tutor;
}
