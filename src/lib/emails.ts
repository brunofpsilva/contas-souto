// Lista de emails autorizados (ALLOWED_EMAILS, separados por vírgula).
// Comparação sem maiúsculas nem espaços. Lista vazia = ninguém entra.

export function lerEmailsAutorizados(valor: string | undefined = process.env.ALLOWED_EMAILS): Set<string> {
  return new Set(
    (valor ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function emailAutorizado(email: string | null | undefined, lista = lerEmailsAutorizados()): boolean {
  if (!email) return false;
  return lista.has(email.trim().toLowerCase());
}
