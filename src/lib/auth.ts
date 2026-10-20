import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { emailAutorizado } from "./emails";

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
      const verificado = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!email || verificado === false || !emailAutorizado(email)) return false;

      const nome = (profile?.name ?? user.name ?? email.split("@")[0]).trim();
      await db
        .insert(schema.utilizadores)
        .values({ email, nome })
        .onConflictDoUpdate({ target: schema.utilizadores.email, set: { nome, ultimoLogin: new Date() } });
      return true;
    },
  },
};

export interface Utilizador {
  email: string;
  nome: string;
}

/** Utilizador da sessão, ou null. Volta a verificar a lista de emails a cada pedido. */
export async function utilizadorAtual(): Promise<Utilizador | null> {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase();
  if (!email || !emailAutorizado(email)) return null;
  return { email, nome: s?.user?.name ?? email };
}

/** Para páginas e server actions: sem sessão válida, vai para o login. */
export async function exigirUtilizador(): Promise<Utilizador> {
  const u = await utilizadorAtual();
  if (!u) redirect("/login");
  return u;
}
