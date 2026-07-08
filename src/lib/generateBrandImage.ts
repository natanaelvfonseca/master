import { promptRules, brandColors } from "./brand";
import type { BrandPlenSettings } from "./brand-plen-settings";

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
  hasSubjectPhoto?: boolean;
  referenceImageUrl?: string;
  brandSettings?: Pick<
    BrandPlenSettings,
    "stylePrompt" | "tonePrompt" | "requiredRules" | "forbiddenRules"
  >;
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
 * Monta automaticamente o prompt final usando o Brand Kit da Master.
 * O usuário não precisa escrever prompt técnico.
 */
export function getBrandImageSize(pieceType: string): BrandImageSize {
  return sizeByPieceType[pieceType] ?? "1024x1024";
}

export function buildBrandImagePrompt(input: BrandImageInput) {
  const palette = brandColors.map((c) => `${c.name} (${c.hex})`).join(", ");
  const stylePrompt = input.brandSettings?.stylePrompt || promptRules.estilo;
  const tonePrompt = input.brandSettings?.tonePrompt || promptRules.tom;
  const requiredRules = input.brandSettings?.requiredRules?.length
    ? input.brandSettings.requiredRules
    : promptRules.obrigatorias;
  const forbiddenRules = input.brandSettings?.forbiddenRules?.length
    ? input.brandSettings.forbiddenRules
    : promptRules.proibidas;

  return [
    `Crie uma peça de comunicação do tipo "${input.pieceType}" para a Escola Técnica Master.`,
    input.unitName ? `Unidade: ${input.unitName}.` : "",
    `Objetivo: ${input.objective}. Curso: ${input.course}. Público-alvo: ${input.audience}.`,
    `Descrição: ${input.description}`,
    `Estilo visual: ${input.visualStyle}. ${stylePrompt}`,
    `Tom: ${tonePrompt}`,
    `Paleta obrigatória: ${palette}.`,
    `Obrigatório: ${requiredRules.join("; ")}.`,
    `Proibido: ${forbiddenRules.join("; ")}.`,
    input.applyLogo
      ? "Use o logo oficial da Master enviado como imagem de referência. Preserve a marca, mantenha área de respiro e aplique em posição nobre sem distorção."
      : "Não inclua o logo na arte.",
    input.overlayText
      ? `Texto exato na arte, em português e com alta legibilidade: "${input.overlayText}".`
      : "Não renderize textos adicionais na imagem além de elementos visuais da campanha.",
    input.hasSubjectPhoto
      ? "Uma foto base da pessoa/aluno foi enviada como referência. Use essa pessoa como base visual principal da arte, preservando identidade, rosto e características principais com tratamento profissional e institucional. Não troque a pessoa por modelo genérico."
      : "",
    input.referenceImageUrl ? `Referência visual: ${input.referenceImageUrl}.` : "",
    "Composição limpa, premium e institucional, com contraste forte, pessoas profissionais e diversas quando fizer sentido, sem aparência genérica de banco de imagens.",
    "Resultado final: imagem pronta para campanha, com identidade Master preservada e qualidade visual alta.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateBrandImage(input: BrandImageInput) {
  return { prompt: buildBrandImagePrompt(input), status: "ready" as const };
}
