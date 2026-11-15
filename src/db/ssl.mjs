// Decides whether the Postgres connection uses SSL.
// - Railway's private network and the local machine: no SSL.
// - Any other address (e.g. Railway's public TCP Proxy): SSL required.
//   "require" encrypts but doesn't validate the certificate (Railway uses its own certificates).
// - If the URL already has ?sslmode=..., that one wins.
export function sslFor(url) {
  const u = new URL(url);
  if (u.searchParams.has("sslmode")) return undefined;
  const host = u.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".railway.internal")) return false;
  return "require";
}
