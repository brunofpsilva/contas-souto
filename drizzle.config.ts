import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Locally, reads the .env (on Vercel the variables are already in the environment).
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
