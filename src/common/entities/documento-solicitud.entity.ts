import { TipoDocumento } from '../enums';
import { Solicitud } from './solicitud.entity';
import { Tutor } from './tutor.entity';

export class DocumentoSolicitud {
  id: string;
  solicitudId: string;
  tipoDocumento: TipoDocumento;
  archivoUrl: string;
  validado: boolean;
  fechaValidacion?: Date;
  validadorId?: string;

  solicitud?: Solicitud;
  validador?: Tutor;
}
