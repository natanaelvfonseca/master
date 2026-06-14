import { promptRules, brandColors } from "./brand";

export type BrandImageQuality = "low" | "medium" | "high";
export type BrandImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type BrandImageOutputFormat = "png" | "jpeg" | "webp";

export type BrandImageInput = {
  pieceType: string;
  objective: string;
  course: string;
  audience: string;
  description: string;
  visualStyle: string;
  overlayText?: string;
  unitName?: string;
  applyLogo?: boolean;
  referenceImageUrl?: string;
};

const sizeByPieceType: Record<string, BrandImageSize> = {
  post: "1024x1536",
  story: "1024x1536",
  banner: "1536x1024",
  capa: "1536x1024",
  ads: "1024x1024",
  comercial: "1024x1536",
  custom: "1024x1024",
};

/**
 * Monta automaticamente o prompt final usando o Brand Kit da Plenarius.
 * O usuário não precisa escrever prompt técnico.
 */
export function getBrandImageSize(pieceType: string): BrandImageSize {
  return sizeByPieceType[pieceType] ?? "1024x1024";
}

export function buildBrandImagePrompt(input: BrandImageInput) {
  const palette = brandColors.map((c) => `${c.name} (${c.hex})`).join(", ");

  return [
    `Crie uma peça de comunicação do tipo "${input.pieceType}" para a Escola Técnica Plenarius.`,
    input.unitName ? `Unidade: ${input.unitName}.` : "",
    `Objetivo: ${input.objective}. Curso: ${input.course}. Público-alvo: ${input.audience}.`,
    `Descrição: ${input.description}`,
    `Estilo visual: ${input.visualStyle}. ${promptRules.estilo}`,
    `Tom: ${promptRules.tom}`,
    `Paleta obrigatória: ${palette}.`,
    `Obrigatório: ${promptRules.obrigatorias.join("; ")}.`,
    `Proibido: ${promptRules.proibidas.join("; ")}.`,
    input.applyLogo
      ? "Use o logo oficial da Plenarius enviado como imagem de referência. Preserve a marca, mantenha área de respiro e aplique em posição nobre sem distorção."
      : "Não inclua o logo na arte.",
    input.overlayText
      ? `Texto exato na arte, em português e com alta legibilidade: "${input.overlayText}".`
      : "Não renderize textos adicionais na imagem além de elementos visuais da campanha.",
    input.referenceImageUrl ? `Referência visual: ${input.referenceImageUrl}.` : "",
    "Composição limpa, premium e institucional, com contraste forte, pessoas profissionais e diversas quando fizer sentido, sem aparência genérica de banco de imagens.",
    "Resultado final: imagem pronta para campanha, com identidade Plenarius preservada e qualidade visual alta.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateBrandImage(input: BrandImageInput) {
  return { prompt: buildBrandImagePrompt(input), status: "ready" as const };
}
