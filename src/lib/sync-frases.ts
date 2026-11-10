// Frases que a app mostra quando a atualização dos saldos falha. A mensagem técnica (com
// códigos HTTP e nomes de variáveis) fica no log do servidor e na tabela das sincronizações;
// o ecrã escolhe a frase pelo código do erro, o que também serve para os erros antigos.

const LIGACAO = "Não foi possível ligar ao Wallet.";
const ACESSO = "O Wallet recusou o acesso. É preciso um token novo.";

const FRASES: Record<string, string> = {
  sem_token: LIGACAO,
  token_invalido: ACESSO,
  proibido: ACESSO,
  premium: "O Wallet pede o plano Premium ativo.",
  consentimento: "É preciso autorizar o acesso nas definições do Wallet.",
  erro_servidor: "O Wallet está indisponível de momento.",
  erro_http: LIGACAO,
  sem_ligacao: LIGACAO,
  formato: "Não foi possível ler os dados do Wallet.",
  a_decorrer: "Já há uma atualização a decorrer.",
  demasiado_cedo: "Atualização pedida há instantes. Disponível dentro de meio minuto.",
};

/** Erros que passam sozinhos: a frase diz quando se pode voltar a tentar. */
const COM_ESPERA: Record<string, string> = {
  sincronizacao_inicial: "O Wallet ainda está a preparar os dados.",
  limite_pedidos: "Limite de pedidos ao Wallet atingido.",
};

export function fraseErroSync(codigo: string | null | undefined, minutos?: number | null): string {
  const espera = COM_ESPERA[codigo ?? ""];
  if (espera) return `${espera} Disponível dentro de ${minutos ? `${minutos} min` : "alguns minutos"}.`;
  return FRASES[codigo ?? ""] ?? LIGACAO;
}
