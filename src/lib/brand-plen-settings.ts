import { promptRules } from "./brand";
import type { BrandImageQuality } from "./generateBrandImage";

export type BrandPlenReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  createdAt: string;
};

export type BrandPlenReferenceMap = Record<string, Array<BrandPlenReferenceImage>>;

export type BrandPlenSettings = {
  unitId: string;
  stylePrompt: string;
  tonePrompt: string;
  requiredRules: Array<string>;
  forbiddenRules: Array<string>;
  defaultQuality: BrandImageQuality;
  logoDataUrl: string | null;
  referencesByPieceType: BrandPlenReferenceMap;
  updatedAt: string | null;
  updatedByName: string | null;
};

export const MAX_BRAND_PLEN_REFERENCES_PER_TYPE = 4;
export const DEFAULT_BRAND_PLEN_IMAGE_QUALITY: BrandImageQuality = "medium";

export function buildDefaultBrandPlenSettings(unitId = ""): BrandPlenSettings {
  return {
    unitId,
    stylePrompt: promptRules.estilo,
    tonePrompt: promptRules.tom,
    requiredRules: promptRules.obrigatorias,
    forbiddenRules: promptRules.proibidas,
    defaultQuality: DEFAULT_BRAND_PLEN_IMAGE_QUALITY,
    logoDataUrl: null,
    referencesByPieceType: {},
    updatedAt: null,
    updatedByName: null,
  };
}
