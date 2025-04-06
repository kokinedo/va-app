import { PrismaClient } from '@prisma/client';

// Prevents multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}

// Re-export types if needed, but the client instance is the main thing
export * from '@prisma/client';
