import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/emails";

// First barrier: without a session for an allowed email, go to /login.
// Pages and server actions check again (requireUser).
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token && isAllowedEmail(token.email)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (token) url.searchParams.set("error", "AccessDenied");
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except: login, Auth.js routes, cron, health, Next and PWA files.
  matcher: [
    "/((?!login|api/auth|api/cron|api/health|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
