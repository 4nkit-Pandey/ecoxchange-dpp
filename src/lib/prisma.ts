import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // Transaction pooler (port 6543) — required for Vercel serverless functions
  // Session pooler (port 5432) — only used by Prisma CLI (db push/migrate)
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://postgres.cjinnwjtxlxyhrbbkutz:Ankitech%40999@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
