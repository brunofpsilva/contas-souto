// Decide se a ligação ao Postgres usa SSL.
// - Rede interna do Railway e máquina local: sem SSL.
// - Qualquer outro endereço (p. ex. o TCP Proxy público do Railway): SSL obrigatório.
//   "require" encripta mas não valida o certificado (o Railway usa certificados próprios).
// - Se o URL já trouxer ?sslmode=..., é esse que vale.
export function sslPara(url) {
  const u = new URL(url);
  if (u.searchParams.has("sslmode")) return undefined;
  const host = u.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".railway.internal")) return false;
  return "require";
}
