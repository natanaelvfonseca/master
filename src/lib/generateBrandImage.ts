import { promptRules, brandColors } from "./brand";

export type BrandImageInput = {
  pieceType: string;
  objective: string;
  course: string;
  audience: string;
  description: string;
  visualStyle: string;
  overlayText?: string;
  referenceImageUrl?: string;
};

/**
 * generateBrandImage — monta automaticamente o prompt final usando o Brand Kit
 * da Plenarius. O usuário não precisa escrever prompt técnico.
 *
 * Estrutura preparada para integração futura com a OpenAI Images API
 * (ou Lovable AI Gateway com openai/gpt-image-2).
 */
export async function generateBrandImage(input: BrandImageInput) {
  const palette = brandColors.map((c) => `${c.name} (${c.hex})`).join(", ");

  const prompt = [
    `Crie uma peça do tipo "${input.pieceType}" para a Escola Profissionalizante Plenarius.`,
    `Objetivo: ${input.objective}. Curso: ${input.course}. Público-alvo: ${input.audience}.`,
    `Descrição: ${input.description}`,
    `Estilo visual: ${input.visualStyle}. ${promptRules.estilo}`,
    `Tom: ${promptRules.tom}`,
    `Paleta obrigatória: ${palette}.`,
    `Obrigatório: ${promptRules.obrigatorias.join("; ")}.`,
    `Proibido: ${promptRules.proibidas.join("; ")}.`,
    input.overlayText ? `Texto na arte: "${input.overlayText}".` : "",
    input.referenceImageUrl ? `Referência visual: ${input.referenceImageUrl}.` : "",
    `Resultado: imagem editorial profissional, alta resolução, identidade Plenarius preservada.`,
  ].filter(Boolean).join(" ");

  // Placeholder — integração real com OpenAI Images será conectada via server function.
  return { prompt, status: "ready_for_integration" as const };
}
