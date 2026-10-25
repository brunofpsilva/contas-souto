import { describe, expect, test } from "vitest";
import { emailAutorizado, lerEmailsAutorizados } from "@/lib/emails";

describe("ALLOWED_EMAILS", () => {
  const lista = lerEmailsAutorizados(" Ana@Gmail.com , rui@gmail.com,, lixo ");

  test("lê a lista sem espaços nem maiúsculas e ignora entradas inválidas", () => {
    expect([...lista]).toEqual(["ana@gmail.com", "rui@gmail.com"]);
  });

  test("aceita só emails da lista", () => {
    expect(emailAutorizado("ana@gmail.com", lista)).toBe(true);
    expect(emailAutorizado(" RUI@gmail.com", lista)).toBe(true);
    expect(emailAutorizado("outro@gmail.com", lista)).toBe(false);
    expect(emailAutorizado("ana@gmail.com.evil.com", lista)).toBe(false);
    expect(emailAutorizado(null, lista)).toBe(false);
  });

  test("lista vazia ou em falta: ninguém entra", () => {
    expect(emailAutorizado("ana@gmail.com", lerEmailsAutorizados(""))).toBe(false);
  });
});
