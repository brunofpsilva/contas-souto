// Drawing of the app icon (used by icon.tsx and apple-icon.tsx).
// The text stays within the central 70%, so it also works as a "maskable" icon.
// The colours are the light theme's brand colours (an icon has only one version).
import { COLORS } from "./theme";

export function AppIcon({ size }: { size: number }) {
  const small = size < 64;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.light.brand,
        color: COLORS.light.onBrand,
        borderRadius: small ? size * 0.2 : 0,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      {small ? (
        <div style={{ display: "flex", fontSize: size * 0.56 }}>CS</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: size * 0.12, opacity: 0.85, letterSpacing: "0.04em" }}>Contas</div>
          <div style={{ display: "flex", fontSize: size * 0.21, marginTop: size * 0.01 }}>Souto</div>
        </div>
      )}
    </div>
  );
}
