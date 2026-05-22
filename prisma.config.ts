import { defineConfig } from "prisma/config";

// Used by Prisma CLI only (db push, migrate, generate)
// Runtime client reads URL via PrismaPg adapter in src/lib/prisma.ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "postgresql://postgres.cjinnwjtxlxyhrbbkutz:Ankitech%40999@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  },
});
