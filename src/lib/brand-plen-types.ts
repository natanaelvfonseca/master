import type {
  BrandImageOutputFormat,
  BrandImageQuality,
  BrandImageSize,
} from "./generateBrandImage";

export type BrandPlenGenerationStatus = "generating" | "ready" | "failed";

export type BrandPlenGeneration = {
  id: string;
  unitId: string;
  status: BrandPlenGenerationStatus;
  dataUrl: string | null;
  revisedPrompt: string | null;
  prompt: string;
  pieceType: string;
  objective: string;
  course: string;
  audience: string;
  visualStyle: string;
  description: string;
  overlayText: string | null;
  model: string;
  size: BrandImageSize;
  quality: BrandImageQuality;
  format: BrandImageOutputFormat;
  errorMessage: string | null;
  publishedMaterialId: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
};
