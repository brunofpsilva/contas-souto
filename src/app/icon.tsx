import { ImageResponse } from "next/og";
import { DesenhoIcone } from "@/lib/icone";

const TAMANHOS = [32, 192, 512];

export function generateImageMetadata() {
  return TAMANHOS.map((t) => ({ id: String(t), size: { width: t, height: t }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const t = Number(await id);
  return new ImageResponse(<DesenhoIcone tamanho={t} />, { width: t, height: t });
}
