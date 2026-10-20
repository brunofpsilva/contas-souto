import { describe, expect, test } from "vitest";
import { emailAutorizado, lerEmailsAutorizados } from "@/lib/emails";

describe("ALLOWED_EMAILS", () => {
  const lista = lerEmailsAutorizados(" Bruno@Gmail.com , mafalda@gmail.com,, lixo ");

  test("lê a lista sem espaços nem maiúsculas e ignora entradas inválidas", () => {
    expect([...lista]).toEqual(["bruno@gmail.com", "mafalda@gmail.com"]);
  });

  test("aceita só emails da lista", () => {
    expect(emailAutorizado("bruno@gmail.com", lista)).toBe(true);
    expect(emailAutorizado(" MAFALDA@gmail.com", lista)).toBe(true);
    expect(emailAutorizado("outro@gmail.com", lista)).toBe(false);
    expect(emailAutorizado("bruno@gmail.com.evil.com", lista)).toBe(false);
    expect(emailAutorizado(null, lista)).toBe(false);
  });

  test("lista vazia ou em falta: ninguém entra", () => {
    expect(emailAutorizado("bruno@gmail.com", lerEmailsAutorizados(""))).toBe(false);
  });
});
