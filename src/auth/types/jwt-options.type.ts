import { JwtSignOptions } from '@nestjs/jwt';

export type JwtSignOptionsType = JwtSignOptions & {
  expiresIn?: string | number;
};
