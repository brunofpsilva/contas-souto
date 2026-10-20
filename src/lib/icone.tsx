// Desenho do ícone da app (usado pelo icon.tsx e pelo apple-icon.tsx).
// O texto fica dentro dos 70% centrais, para funcionar também como ícone "maskable".

export const COR_ICONE = "#1f6b5c";

export function DesenhoIcone({ tamanho }: { tamanho: number }) {
  const pequeno = tamanho < 64;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: COR_ICONE,
        color: "#ffffff",
        borderRadius: pequeno ? tamanho * 0.2 : 0,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {pequeno ? (
        <div style={{ display: "flex", fontSize: tamanho * 0.56 }}>CS</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: tamanho * 0.12, opacity: 0.85, letterSpacing: "0.04em" }}>Contas</div>
          <div style={{ display: "flex", fontSize: tamanho * 0.21, marginTop: tamanho * 0.01 }}>Souto</div>
        </div>
      )}
    </div>
  );
}
