import { describe, expect, test } from "vitest";
import { emailAutorizado, lerEmailsAutorizados } from "@/lib/emails";

describe("ALLOWED_EMAILS", () => {
  const lista = lerEmailsAutorizados(" Rui@Gmail.com , ana@gmail.com,, lixo ");

  test("lê a lista sem espaços nem maiúsculas e ignora entradas inválidas", () => {
    expect([...lista]).toEqual(["rui@gmail.com", "ana@gmail.com"]);
  });

  test("aceita só emails da lista", () => {
    expect(emailAutorizado("rui@gmail.com", lista)).toBe(true);
    expect(emailAutorizado(" ANA@gmail.com", lista)).toBe(true);
    expect(emailAutorizado("outro@gmail.com", lista)).toBe(false);
    expect(emailAutorizado("rui@gmail.com.evil.com", lista)).toBe(false);
    expect(emailAutorizado(null, lista)).toBe(false);
  });

  test("lista vazia ou em falta: ninguém entra", () => {
    expect(emailAutorizado("rui@gmail.com", lerEmailsAutorizados(""))).toBe(false);
  });
});
