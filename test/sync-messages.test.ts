import { describe, expect, test } from "vitest";
import { en } from "@/i18n/en";
import { pt } from "@/i18n/pt";
import { syncErrorMessage } from "@/lib/sync-messages";

describe("sync error sentences", () => {
  test("each code has its own sentence, without technical names", () => {
    expect(syncErrorMessage(pt, "invalid_token")).toBe("O Wallet recusou o acesso. É preciso um token novo.");
    expect(syncErrorMessage(pt, "premium")).toBe("O Wallet pede o plano Premium ativo.");
    expect(syncErrorMessage(pt, "server_error")).toBe("O Wallet está indisponível de momento.");
    expect(syncErrorMessage(pt, "in_progress")).toBe("Já há uma atualização a decorrer.");
    expect(syncErrorMessage(pt, "too_soon")).toBe("Atualização pedida há instantes. Disponível dentro de meio minuto.");
    expect(syncErrorMessage(en, "invalid_token")).toBe("Wallet refused access. A new token is needed.");
    const codes = [
      "no_token",
      "invalid_token",
      "premium",
      "consent",
      "forbidden",
      "initial_sync",
      "rate_limited",
      "server_error",
      "http_error",
      "no_connection",
      "bad_format",
      "in_progress",
      "too_soon",
    ];
    for (const t of [pt, en]) {
      for (const c of codes) expect(syncErrorMessage(t, c, 5)).not.toMatch(/WALLET_API_TOKEN|API|erro \d|error \d|por hora|per hour|Tenta|Try again/);
    }
  });

  test("errors that go away on their own say when", () => {
    expect(syncErrorMessage(pt, "rate_limited", 12)).toBe("Limite de pedidos ao Wallet atingido. Disponível dentro de 12 min.");
    expect(syncErrorMessage(pt, "initial_sync")).toBe("O Wallet ainda está a preparar os dados. Disponível dentro de alguns minutos.");
    expect(syncErrorMessage(en, "rate_limited", 12)).toBe("Wallet request limit reached. Available in 12 min.");
  });

  test("an unknown code (or an old error without a code) gets the general sentence", () => {
    expect(syncErrorMessage(pt, "unknown")).toBe("Não foi possível ligar ao Wallet.");
    expect(syncErrorMessage(pt, null)).toBe("Não foi possível ligar ao Wallet.");
  });
});
