import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sync } from "@/lib/sync";

// Called by the GitHub Actions cron (.github/workflows/sync-wallet.yml): POST with "Authorization: Bearer <CRON_SECRET>".
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 503 });
  }
  if (!authorized(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const r = await sync({ source: "cron" });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
