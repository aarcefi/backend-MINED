import { TipoDocumento } from '@prisma/client';
import { Solicitud } from './solicitud.entity';
import { PerfilFuncionario } from './perfil-funcionario.entity';

export class DocumentoSolicitud {
  id: string;
  solicitudId: string;
  tipoDocumento: TipoDocumento;
  archivoUrl: string;
  nombreArchivo: string;
  validado: boolean;
  fechaValidacion?: Date;
  validadorId?: string;

  solicitud?: Solicitud;
  validador?: PerfilFuncionario;
}
