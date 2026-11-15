import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { sslFor } from "./ssl.mjs";

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const client = postgres(url, { max: 5, idle_timeout: 30, ssl: sslFor(url) });
  return drizzle(client, { schema, casing: "snake_case" });
}

type Database = ReturnType<typeof create>;

// One connection per process, created on first use (the build doesn't need DATABASE_URL).
// In development, hot reload reuses the same one.
const global = globalThis as unknown as { contasSoutoDb?: Database };

function get(): Database {
  global.contasSoutoDb ??= create();
  return global.contasSoutoDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = get();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
