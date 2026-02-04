import { RolUsuario } from '@prisma/client';
import { PerfilSolicitante } from './perfil-solicitante.entity';
import { PerfilFuncionario } from './perfil-funcionario.entity';
import { PerfilComision } from './perfil-comision.entity';
import { Notificacion } from './notificacion.entity';

export class Usuario {
  id: string;
  email: string;
  password: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  refreshToken?: string;
  tokenExpiry?: Date;

  perfilSolicitante?: PerfilSolicitante;
  perfilFuncionario?: PerfilFuncionario;
  perfilComision?: PerfilComision;
  notificaciones?: Notificacion[];
}
