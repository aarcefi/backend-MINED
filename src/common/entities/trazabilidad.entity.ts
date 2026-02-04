import { EstadoSolicitud } from '@prisma/client';
import { Solicitud } from './solicitud.entity';
import { PerfilFuncionario } from './perfil-funcionario.entity';

export class Trazabilidad {
  id: string;
  solicitudId: string;
  estadoAnterior: EstadoSolicitud;
  estadoNuevo: EstadoSolicitud;
  fecha: Date;
  usuarioId: string;
  comentario?: string;

  solicitud?: Solicitud;
  usuario?: PerfilFuncionario;
}
