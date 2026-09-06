// ============================================================================
// PRISMA CLIENT SINGLETON
// ----------------------------------------------------------------------------
// Evita criar múltiplas instâncias do PrismaClient durante hot-reload no
// ambiente de desenvolvimento do Next.js.
// ============================================================================
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
