import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ImagePlus,
  Info,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import plenariusLogo from "@/assets/logo-plenarios-branca.png";
import type { BrandPlenGeneration } from "@/lib/brand-plen-types";
import { useAuth } from "@/lib/auth";
import { audiences, courses, objectives, pieceTypes, visualStyles } from "@/lib/brand";
import { toast } from "sonner";

type GenerateResponse = {
  generations?: Array<BrandPlenGeneration>;
  generation?: BrandPlenGeneration;
  images?: Array<BrandPlenGeneration>;
  error?: string;
  model?: string;
};

const statusLabels = {
  generating: "Gerando",
  ready: "Pronta",
  failed: "Erro",
} as const;

const MAX_SUBJECT_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_SUBJECT_PHOTO_UPLOAD_BYTES = 2 * 1024 * 1024;

export const Route = createFileRoute("/brand-plen/nova")({
  head: () => ({ meta: [{ title: "Nova Criação · Brand Plen" }] }),
  component: NovaCriacao,
});

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {n}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir a ação.");
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}`;
}

function slugifyFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onerror = () => reject(new Error("Não foi possível ler a foto enviada."));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Não foi possível preparar a foto enviada."));
      },
      type,
      quality,
    );
  });
}

async function compressSubjectPhoto(file: File) {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    throw new Error("Envie uma foto em PNG, JPG ou WebP.");
  }

  if (file.size > MAX_SUBJECT_PHOTO_BYTES) {
    throw new Error("A foto precisa ter até 12MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const dimensions = [1600, 1200, 900];
    const qualities = [0.9, 0.82, 0.74, 0.66];
    let fallbackBlob: Blob | null = null;

    for (const maxDimension of dimensions) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Não foi possível preparar a foto enviada.");
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, "image/webp", quality);

        fallbackBlob = blob;

        if (blob.size <= MAX_SUBJECT_PHOTO_UPLOAD_BYTES) {
          return readBlobAsDataUrl(blob);
        }
      }
    }

    if (fallbackBlob && fallbackBlob.size <= MAX_SUBJECT_PHOTO_UPLOAD_BYTES) {
      return readBlobAsDataUrl(fallbackBlob);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  throw new Error("A foto ficou grande demais para enviar. Tente uma imagem menor.");
}

async function loadAssetAsDataUrl(src: string) {
  const response = await fetch(src);

  if (!response.ok) {
    throw new Error("Não foi possível carregar o logo da Plenarius.");
  }

  return readBlobAsDataUrl(await response.blob());
}

function downloadGeneratedImage(image: BrandPlenGeneration) {
  if (!image.dataUrl) {
    return;
  }

  const link = document.createElement("a");
  const courseSlug = slugifyFileName(image.course) || "arte";

  link.href = image.dataUrl;
  link.download = `brand-plen-${courseSlug}-${image.id}.${image.format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function upsertGeneration(
  generations: Array<BrandPlenGeneration>,
  generation: BrandPlenGeneration,
) {
  return [generation, ...generations.filter((item) => item.id !== generation.id)].slice(0, 12);
}

function CreationPreview({ creation }: { creation: BrandPlenGeneration }) {
  if (creation.status === "generating") {
    return (
      <div className="relative flex aspect-[4/5] min-h-[260px] overflow-hidden rounded-lg bg-[linear-gradient(135deg,#0B2A6F_0%,#1746B8_48%,#3F73D8_100%)] text-white">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_42%,transparent_72%)]" />
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-gold" />
          <div className="text-sm font-bold">Gerando sua arte</div>
          <div className="max-w-[210px] text-xs text-white/75">
            A imagem está sendo criada e ficará salva nas suas últimas criações.
          </div>
        </div>
      </div>
    );
  }

  if (creation.status === "failed") {
    return (
      <div className="flex aspect-[4/5] min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-9 w-9 text-destructive" />
        <div className="mt-3 text-sm font-bold text-destructive">Não foi possível gerar</div>
        <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">
          {creation.errorMessage ?? "Tente criar novamente com outro briefing."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/5] min-h-[260px] items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {creation.dataUrl ? (
        <img
          src={creation.dataUrl}
          alt={`Arte ${creation.course}`}
          className="h-full w-full object-contain"
        />
      ) : null}
    </div>
  );
}

function NovaCriacao() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const [piece, setPiece] = useState(pieceTypes[0]?.id ?? "post");
  const [objective, setObjective] = useState(objectives[0] ?? "");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [audience, setAudience] = useState(audiences[0] ?? "");
  const [visualStyle, setVisualStyle] = useState(visualStyles[0] ?? "");
  const [description, setDescription] = useState(
    "Imagem institucional para o curso, destacando ambiente profissional, alunos em prática real e a marca Plenarius como referência em educação profissionalizante.",
  );
  const [overlayText, setOverlayText] = useState("Transforme sua profissão. Matrículas abertas.");
  const [subjectPhotoDataUrl, setSubjectPhotoDataUrl] = useState<string | null>(null);
  const [subjectPhotoName, setSubjectPhotoName] = useState<string | null>(null);
  const [creations, setCreations] = useState<Array<BrandPlenGeneration>>([]);
  const [pendingPreview, setPendingPreview] = useState<BrandPlenGeneration | null>(null);
  const [loading, setLoading] = useState(false);
  const [preparingSubjectPhoto, setPreparingSubjectPhoto] = useState(false);
  const [loadingCreations, setLoadingCreations] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const hasPersistedGenerationRunning = creations.some(
    (creation) => creation.status === "generating",
  );
  const visibleCreations =
    pendingPreview && !hasPersistedGenerationRunning ? [pendingPreview, ...creations] : creations;
  const shouldPoll =
    loading || visibleCreations.some((creation) => creation.status === "generating");

  const loadCreations = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!activeUnitId) {
        setCreations([]);
        return;
      }

      if (!silent) {
        setLoadingCreations(true);
      }

      try {
        const data = await readJson<GenerateResponse>(
          await fetch(`/api/brand-plen/generate${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setCreations(data.generations ?? []);
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar criações.");
        }
      } finally {
        if (!silent) {
          setLoadingCreations(false);
        }
      }
    },
    [activeUnitId],
  );

  useEffect(() => {
    void loadCreations();
  }, [loadCreations]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadCreations({ silent: true });
    }, 3500);

    return () => window.clearInterval(timer);
  }, [loadCreations, shouldPoll]);

  const handleSubjectPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setPreparingSubjectPhoto(true);

    try {
      const dataUrl = await compressSubjectPhoto(file);

      setSubjectPhotoDataUrl(dataUrl);
      setSubjectPhotoName(file.name);
      toast.success("Foto base carregada.");
    } catch (error) {
      setSubjectPhotoDataUrl(null);
      setSubjectPhotoName(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a foto.");
    } finally {
      setPreparingSubjectPhoto(false);
    }
  };

  const removeSubjectPhoto = () => {
    setSubjectPhotoDataUrl(null);
    setSubjectPhotoName(null);
  };

  const generate = async () => {
    if (loading || preparingSubjectPhoto) {
      return;
    }

    if (!activeUnitId) {
      toast.error("Selecione uma unidade ativa antes de gerar a imagem.");
      return;
    }

    setLoading(true);
    setPendingPreview({
      id: `pending-${Date.now()}`,
      unitId: activeUnitId,
      status: "generating",
      dataUrl: null,
      revisedPrompt: null,
      prompt: "",
      pieceType: piece,
      objective,
      course,
      audience,
      visualStyle,
      description,
      overlayText: overlayText.trim() || null,
      model: "",
      size: "1024x1024",
      quality: "medium",
      format: "webp",
      errorMessage: null,
      publishedMaterialId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const logoDataUrl = await loadAssetAsDataUrl(plenariusLogo);
      const response = await fetch("/api/brand-plen/generate", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unitId: activeUnitId,
          pieceType: piece,
          objective,
          course,
          audience,
          visualStyle,
          description,
          overlayText,
          logoDataUrl,
          subjectPhotoDataUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as GenerateResponse | null;

      if (!response.ok) {
        if (data?.generation) {
          setCreations((current) =>
            upsertGeneration(current, data.generation as BrandPlenGeneration),
          );
        }

        throw new Error(data?.error ?? "Não foi possível gerar a imagem agora.");
      }

      if (data?.generation) {
        setCreations((current) =>
          upsertGeneration(current, data.generation as BrandPlenGeneration),
        );
      }

      toast.success("Imagem criada e salva nas suas últimas criações.");
      void loadCreations({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a imagem.");
      void loadCreations({ silent: true });
    } finally {
      setPendingPreview(null);
      setLoading(false);
    }
  };

  const publishToLibrary = async (creation: BrandPlenGeneration) => {
    if (!activeUnitId || creation.status !== "ready" || !creation.dataUrl) {
      return;
    }

    setPublishingId(creation.id);

    try {
      const data = await readJson<GenerateResponse>(
        await fetch("/api/brand-plen/generate", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: creation.id, unitId: activeUnitId }),
        }),
      );

      if (data.generation) {
        setCreations((current) =>
          upsertGeneration(current, data.generation as BrandPlenGeneration),
        );
      }

      toast.success("Imagem enviada para a biblioteca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar para a biblioteca.");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Diretor de Arte com IA"
        title="Nova Criação"
        description="Crie imagens profissionais alinhadas à identidade da marca Plenarius."
        actions={
          <Badge className="border-gold/30 bg-gold/15 text-gold">
            <Sparkles className="mr-1 h-3 w-3" /> IA Plenarius
          </Badge>
        }
      />

      <div className="mx-auto max-w-6xl space-y-5">
        <Step n={1} title="Escolha o tipo de peça">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
            {pieceTypes.map((p) => {
              const active = piece === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => setPiece(p.id)}
                  className={`group flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition ${
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                  type="button"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground">{p.ratio}</div>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={2} title="Briefing da peça">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {objectives.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Curso</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Público-alvo</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estilo visual</Label>
              <Select value={visualStyle} onValueChange={setVisualStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visualStyles.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descrição da imagem</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Texto opcional na arte</Label>
              <Input
                value={overlayText}
                onChange={(event) => setOverlayText(event.target.value)}
                placeholder='Ex: "Transforme sua profissão. Matrículas abertas."'
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Foto base opcional</Label>
              {subjectPhotoDataUrl ? (
                <div className="grid gap-3 rounded-lg border border-primary/15 bg-primary/5 p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="h-32 overflow-hidden rounded-md border bg-white sm:h-28">
                    <img
                      src={subjectPhotoDataUrl}
                      alt="Foto base enviada"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-primary">
                      {subjectPhotoName ?? "Foto base carregada"}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A IA usará esta foto como referência principal da pessoa na arte.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeSubjectPhoto}
                    className="justify-self-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:justify-self-end"
                    aria-label="Remover foto base"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="subject-photo"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/25 bg-[linear-gradient(135deg,rgba(11,42,111,.04),rgba(63,115,216,.09))] p-5 text-center transition hover:border-primary/45 hover:bg-primary/5"
                >
                  <input
                    id="subject-photo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleSubjectPhotoChange}
                    disabled={loading || preparingSubjectPhoto}
                  />
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
                    {preparingSubjectPhoto ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-3 text-sm font-bold text-primary">
                    {preparingSubjectPhoto ? "Preparando foto..." : "Carregar foto"}
                  </div>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Use uma foto do aluno quando a arte precisar manter a pessoa como base visual.
                  </p>
                </label>
              )}
            </div>
          </div>
        </Step>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            size="lg"
            onClick={generate}
            disabled={loading || preparingSubjectPhoto}
            className="h-12 min-w-[280px] gap-2 bg-primary text-primary-foreground shadow-elegant"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {loading ? "Gerando imagem..." : "Gerar imagem com IA"}
          </Button>
          <p className="text-xs text-muted-foreground">
            A criação fica salva para você. Só vai para a biblioteca quando você enviar.
          </p>
        </div>

        <Step n={3} title="Últimas criações">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {visibleCreations.length
                ? `${visibleCreations.length} criações recentes`
                : "Nenhuma criação recente"}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-2"
              onClick={() => loadCreations()}
              disabled={loadingCreations}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingCreations ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {visibleCreations.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCreations.map((creation) => (
                <div
                  key={creation.id}
                  className="overflow-hidden rounded-lg border bg-card shadow-sm"
                >
                  <CreationPreview creation={creation} />

                  <div className="space-y-3 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">
                          {pieceTypes.find((p) => p.id === creation.pieceType)?.label ??
                            creation.pieceType}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {creation.course} · {creation.objective}
                        </div>
                      </div>
                      <Badge
                        className={
                          creation.status === "ready"
                            ? "bg-success/10 text-success"
                            : creation.status === "failed"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                        }
                      >
                        {creation.status === "ready" ? (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        ) : creation.status === "failed" ? (
                          <AlertCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {creation.publishedMaterialId
                          ? "Biblioteca"
                          : statusLabels[creation.status]}
                      </Badge>
                    </div>

                    <div className="rounded-md bg-muted/40 p-2 text-xs">
                      <div className="text-muted-foreground">Criada em</div>
                      <div className="font-semibold">{formatDate(creation.createdAt)}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 gap-1.5"
                        disabled={creation.status !== "ready" || !creation.dataUrl}
                        onClick={() => downloadGeneratedImage(creation)}
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 flex-1 gap-1.5 bg-primary text-primary-foreground"
                        disabled={
                          creation.status !== "ready" ||
                          !creation.dataUrl ||
                          Boolean(creation.publishedMaterialId) ||
                          publishingId === creation.id
                        }
                        onClick={() => publishToLibrary(creation)}
                      >
                        {publishingId === creation.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                        {creation.publishedMaterialId ? "Enviada" : "Biblioteca"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-accent/20 p-6 text-center">
              <ImagePlus className="h-9 w-9 text-muted-foreground" />
              <div className="mt-3 text-sm font-semibold">
                {loadingCreations ? "Carregando criações..." : "Nenhuma imagem criada ainda"}
              </div>
              <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                As próximas imagens geradas aparecem aqui automaticamente.
              </p>
            </div>
          )}
        </Step>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        As criações ficam privadas para o usuário até serem enviadas para a biblioteca da marca.
      </div>
    </div>
  );
}
