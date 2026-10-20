import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { emailAutorizado } from "@/lib/emails";

// Primeira barreira: sem sessão de um email autorizado, vai para /login.
// As páginas e as server actions voltam a verificar (exigirUtilizador).
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token && emailAutorizado(token.email)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (token) url.searchParams.set("error", "AccessDenied");
  return NextResponse.redirect(url);
}

export const config = {
  // Tudo menos: login, rotas do Auth.js, cron, health, ficheiros do Next e da PWA.
  matcher: [
    "/((?!login|api/auth|api/cron|api/health|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
