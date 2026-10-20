// Valores fixos do domínio, partilhados entre a base de dados, a validação e a interface.

export const CATEGORIAS = [
  "Escritura e impostos",
  "Obras",
  "Mobília",
  "Eletrodomésticos",
  "Cozinha",
  "Ligações (luz, água, gás, net)",
  "Mudança",
  "Decoração",
  "Outros",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const PESSOAS = ["Ambos", "Bruno", "Mafalda"] as const;
export type Pessoa = (typeof PESSOAS)[number];

export const ESTADOS = ["previsto", "pago"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ORIGENS_SYNC = ["manual", "cron"] as const;
export type OrigemSync = (typeof ORIGENS_SYNC)[number];

export const LIMITE_DESCRICAO = 120;
export const LIMITE_NOTA = 200;
