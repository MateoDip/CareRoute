import { PrismaClient } from "@prisma/client";

/**
 * Cliente único de Prisma.
 *
 * En desarrollo, Next.js recarga los módulos en cada cambio de archivo. Sin este
 * cache, cada recarga crearía un PrismaClient nuevo y en pocos minutos se agotarían
 * las conexiones del pooler de Supabase. Guardarlo en `globalThis` hace que
 * sobreviva a las recargas.
 *
 * En producción no hace falta: el proceso arranca una sola vez.
 */
const globalConPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalConPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalConPrisma.prisma = prisma;
}
