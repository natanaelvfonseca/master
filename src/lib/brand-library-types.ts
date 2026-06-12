export type BrandLibraryMediaType = "image" | "video";

export type BrandLibraryMaterial = {
  id: string;
  unitId: string;
  course: string;
  title: string;
  fileName: string;
  mimeType: string;
  mediaType: BrandLibraryMediaType;
  dataUrl: string;
  createdByName: string | null;
  createdAt: string;
};
