import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
  },
});
