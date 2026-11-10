import { describe, expect, test } from "vitest";
import { fraseErroSync } from "@/lib/sync-frases";

describe("frases dos erros da atualização", () => {
  test("cada código tem a sua frase, sem nomes técnicos", () => {
    expect(fraseErroSync("token_invalido")).toBe("O Wallet recusou o acesso. É preciso um token novo.");
    expect(fraseErroSync("premium")).toBe("O Wallet pede o plano Premium ativo.");
    expect(fraseErroSync("erro_servidor")).toBe("O Wallet está indisponível de momento.");
    expect(fraseErroSync("a_decorrer")).toBe("Já há uma atualização a decorrer.");
    expect(fraseErroSync("demasiado_cedo")).toBe("Atualização pedida há instantes. Disponível dentro de meio minuto.");
    const codigos = ["sem_token", "token_invalido", "premium", "consentimento", "proibido", "sincronizacao_inicial", "limite_pedidos", "erro_servidor", "erro_http", "sem_ligacao", "formato", "a_decorrer", "demasiado_cedo"];
    for (const c of codigos) expect(fraseErroSync(c, 5)).not.toMatch(/WALLET_API_TOKEN|API|erro \d|por hora|Tenta/);
  });

  test("os erros que passam sozinhos dizem quando", () => {
    expect(fraseErroSync("limite_pedidos", 12)).toBe("Limite de pedidos ao Wallet atingido. Disponível dentro de 12 min.");
    expect(fraseErroSync("sincronizacao_inicial")).toBe("O Wallet ainda está a preparar os dados. Disponível dentro de alguns minutos.");
  });

  test("um código desconhecido (ou um erro antigo sem código) tem a frase geral", () => {
    expect(fraseErroSync("desconhecido")).toBe("Não foi possível ligar ao Wallet.");
    expect(fraseErroSync(null)).toBe("Não foi possível ligar ao Wallet.");
  });
});
