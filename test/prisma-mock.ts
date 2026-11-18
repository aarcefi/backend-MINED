/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export type PrismaMock = DeepMockProxy<PrismaClient>;

export const createPrismaMock = (): PrismaMock => mockDeep<PrismaClient>();

/**
 * `prisma.$transaction` acepta dos firmas: array de promesas o callback.
 * Este helper hace que el mock soporte ambas.
 */
export const setupTransaction = (prisma: PrismaMock): void => {
  (prisma.$transaction as unknown as jest.Mock).mockImplementation(
    (arg: any) => {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    },
  );
};
