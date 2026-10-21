// Build da app. Na Vercel, em produção, aplica primeiro as migrações da base de dados.
// Builds locais e de pré-visualização (preview) nunca mexem na base de dados.
import { spawnSync } from "node:child_process";

function correr(comando) {
  console.log(`> ${comando}`);
  const r = spawnSync(comando, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  correr("node scripts/migrar.mjs");
} else if (process.env.VERCEL_ENV) {
  console.log(`Ambiente ${process.env.VERCEL_ENV}: sem migrações.`);
}

correr("next build");
