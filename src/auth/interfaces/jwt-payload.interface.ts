import { RolUsuario } from '@prisma/client';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  rol: RolUsuario;
  iat?: number; // issued at
  exp?: number; // expiration
}
