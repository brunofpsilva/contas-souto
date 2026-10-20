import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Uma só ligação por processo; em desenvolvimento o hot reload reaproveita a mesma.
const global = globalThis as unknown as { pgSql?: ReturnType<typeof postgres> };

function ligar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta configurar DATABASE_URL.");
  return postgres(url, { max: 5, idle_timeout: 30 });
}

const sqlClient = global.pgSql ?? ligar();
if (process.env.NODE_ENV !== "production") global.pgSql = sqlClient;

export const db = drizzle(sqlClient, { schema, casing: "snake_case" });
export { schema };
