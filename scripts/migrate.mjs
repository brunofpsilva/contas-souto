// Applies the migrations in ./drizzle to the DATABASE_URL database.
// Only uses production dependencies (on Vercel it runs in the production build, see scripts/build.mjs).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sslFor } from "../src/db/ssl.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {}, ssl: sslFor(url) });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
} catch (e) {
  console.error("Migration error:", e);
  process.exitCode = 1;
} finally {
  await client.end();
}
