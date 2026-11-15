import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { isAllowedEmail } from "./emails";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile, user }) {
      const email = (profile?.email ?? user.email ?? "").toLowerCase();
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!email || verified === false || !isAllowedEmail(email)) return false;

      const name = (profile?.name ?? user.name ?? email.split("@")[0]).trim();
      await db
        .insert(schema.users)
        .values({ email, name })
        .onConflictDoUpdate({ target: schema.users.email, set: { name, lastLoginAt: new Date() } });
      return true;
    },
  },
};

export interface SessionUser {
  email: string;
  name: string;
}

/** User of the session, or null. Checks the email list again on every request. */
export async function currentUser(): Promise<SessionUser | null> {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase();
  if (!email || !isAllowedEmail(email)) return null;
  return { email, name: s?.user?.name ?? email };
}

/** For pages and server actions: without a valid session, go to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
