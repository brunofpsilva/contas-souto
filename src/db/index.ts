import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function criar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta configurar DATABASE_URL.");
  const cliente = postgres(url, { max: 5, idle_timeout: 30 });
  return drizzle(cliente, { schema, casing: "snake_case" });
}

type BaseDeDados = ReturnType<typeof criar>;

// Uma só ligação por processo, criada no primeiro uso (o build não precisa de DATABASE_URL).
// Em desenvolvimento o hot reload reaproveita a mesma.
const global = globalThis as unknown as { contasSoutoDb?: BaseDeDados };

function obter(): BaseDeDados {
  global.contasSoutoDb ??= criar();
  return global.contasSoutoDb;
}

export const db = new Proxy({} as BaseDeDados, {
  get(_alvo, prop) {
    const real = obter();
    const valor = Reflect.get(real, prop, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

export { schema };
