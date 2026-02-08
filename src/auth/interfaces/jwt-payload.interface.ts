import { RolUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  perfilId?: string;
  iat?: number;
  exp?: number;
}
