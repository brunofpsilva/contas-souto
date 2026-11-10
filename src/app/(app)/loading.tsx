/** Enquanto um ecrã carrega: a forma dos cartões, sem texto. */
export default function ACarregar() {
  return (
    <div role="status" aria-label="A carregar" className="grid gap-4">
      <div className="bg-superficie-suave h-44 animate-pulse rounded-xl" />
      <div className="bg-superficie-suave h-5 w-44 animate-pulse rounded-sm" />
      <div className="bg-superficie-suave h-60 animate-pulse rounded-xl" />
    </div>
  );
}
