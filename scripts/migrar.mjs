// Aplica as migrações de ./drizzle à base de dados de DATABASE_URL.
// Só usa dependências de produção (no Railway corre antes de cada deploy).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { sslPara } from "../src/db/ssl.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta configurar DATABASE_URL.");
  process.exit(1);
}

const cliente = postgres(url, { max: 1, onnotice: () => {}, ssl: sslPara(url) });
try {
  await migrate(drizzle(cliente), { migrationsFolder: "./drizzle" });
  console.log("Migrações aplicadas.");
} catch (e) {
  console.error("Erro nas migrações:", e);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
