// App build. On Vercel, in production, it applies the database migrations first.
// Local and preview builds never touch the database.
import { spawnSync } from "node:child_process";

function run(command) {
  console.log(`> ${command}`);
  const r = spawnSync(command, { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  run("node scripts/migrate.mjs");
} else if (process.env.VERCEL_ENV) {
  console.log(`${process.env.VERCEL_ENV} environment: no migrations.`);
}

run("next build");
