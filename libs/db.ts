import { PrismaClient } from '@prisma/client';

const prismaSingleton = (): PrismaClient => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new PrismaClient();
};

declare global {
  // eslint-disable-next-line -- PrismaClient singleton pattern (safe type)
  var prisma: PrismaClient | undefined;
}

interface GlobalWithPrisma {
  prisma?: PrismaClient;
}

const globalForPrisma = globalThis as unknown as GlobalWithPrisma;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const prisma: PrismaClient = globalForPrisma.prisma ?? prismaSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  globalForPrisma.prisma = prisma;
}
