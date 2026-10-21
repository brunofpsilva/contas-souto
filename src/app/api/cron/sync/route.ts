import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sincronizar } from "@/lib/sync";

// Chamado pelo cron do GitHub Actions (.github/workflows/sincronizar-wallet.yml): POST com "Authorization: Bearer <CRON_SECRET>".
function autorizado(cabecalho: string | null): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || !cabecalho?.startsWith("Bearer ")) return false;
  const a = Buffer.from(cabecalho.slice(7));
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, erro: "CRON_SECRET não está configurado." }, { status: 503 });
  }
  if (!autorizado(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }
  const r = await sincronizar({ origem: "cron" });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
