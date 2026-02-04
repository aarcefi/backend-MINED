import { Usuario } from '@prisma/client';

export type UsuarioSinPassword = Omit<Usuario, 'password'> & {
  perfilSolicitante?: any;
  perfilFuncionario?: any;
  perfilComision?: any;
  notificaciones?: any[];
};
