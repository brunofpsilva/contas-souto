import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Em local, lê o .env (na Vercel as variáveis já estão no ambiente).
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
