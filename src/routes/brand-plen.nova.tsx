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
  Trash2,
  Upload,
  Wand2,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import plenariusLogo from "@/assets/logo-plenarios-branca.png";
import type { BrandPlenGeneration } from "@/lib/brand-plen-types";
import { useAuth } from "@/lib/auth";
import { canManageBrandPlen } from "@/lib/auth-types";
import { audiences, brandColors, courses, objectives, pieceTypes, visualStyles } from "@/lib/brand";
import { toast } from "sonner";

type GenerateResponse = {
  generations?: Array<BrandPlenGeneration>;
  generation?: BrandPlenGeneration;
  images?: Array<BrandPlenGeneration>;
  error?: string;
  model?: string;
};

type ReferenceUpload = {
  name: string;
  dataUrl: string;
};

const qualityLabels = {
  high: "Alta",
  medium: "Média",
  low: "Rápida",
} as const;

const statusLabels = {
  generating: "Gerando",
  ready: "Pronta",
  failed: "Erro",
} as const;

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
            O Brand Plen está criando a imagem com as diretrizes da marca.
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
  const [showText, setShowText] = useState(true);
  const [applyLogo, setApplyLogo] = useState(true);
  const [quality, setQuality] = useState<BrandPlenGeneration["quality"]>("high");
  const [referenceUpload, setReferenceUpload] = useState<ReferenceUpload | null>(null);
  const [creations, setCreations] = useState<Array<BrandPlenGeneration>>([]);
  const [pendingPreview, setPendingPreview] = useState<BrandPlenGeneration | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCreations, setLoadingCreations] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const canViewBrandKit = session ? canManageBrandPlen(session.user.role) : false;

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

  const handleReferenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      toast.error("A referência precisa ter até 6 MB.");
      return;
    }

    try {
      setReferenceUpload({ name: file.name, dataUrl: await readBlobAsDataUrl(file) });
      toast.success("Referência visual adicionada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a imagem.");
    }
  };

  const generate = async () => {
    if (loading) {
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
      overlayText: showText ? overlayText : null,
      model: "",
      size: "1024x1024",
      quality,
      format: "webp",
      errorMessage: null,
      publishedMaterialId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const logoDataUrl = applyLogo ? await loadAssetAsDataUrl(plenariusLogo) : undefined;
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
          overlayText: showText ? overlayText : "",
          applyLogo,
          logoDataUrl,
          referenceImageDataUrl: referenceUpload?.dataUrl,
          quality,
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
        description="Crie imagens profissionais com IA alinhadas à identidade da marca Plenarius."
        actions={
          <Badge className="border-gold/30 bg-gold/15 text-gold">
            <Sparkles className="mr-1 h-3 w-3" /> Brand Kit ativo
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Step n={1} title="Escolha o tipo de peça">
            <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
              {pieceTypes.map((p) => {
                const active = piece === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => setPiece(p.id)}
                    className={`group flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
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
                  disabled={!showText}
                  value={overlayText}
                  onChange={(event) => setOverlayText(event.target.value)}
                  placeholder='Ex: "Transforme sua profissão. Matrículas abertas."'
                />
              </div>
            </div>
          </Step>

          <Step n={3} title="Referências visuais">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/25 p-3">
                <img
                  src={plenariusLogo}
                  alt="Logo Plenarius"
                  className="h-14 w-24 rounded-md bg-primary object-contain p-2"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Logo oficial da Plenarius</div>
                  <p className="text-xs text-muted-foreground">
                    Enviado como referência quando a aplicação automática do logo estiver ativa.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Input
                  id="brand-reference-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleReferenceUpload}
                />
                <Button asChild variant="outline" className="gap-2">
                  <label htmlFor="brand-reference-upload">
                    <Upload className="h-4 w-4" /> Adicionar referência
                  </label>
                </Button>
              </div>
            </div>

            {referenceUpload ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={referenceUpload.dataUrl}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <span className="truncate text-sm font-medium">{referenceUpload.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={() => setReferenceUpload(null)}
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </Button>
              </div>
            ) : null}
          </Step>

          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              size="lg"
              onClick={generate}
              disabled={loading}
              className="h-12 min-w-[280px] gap-2 bg-primary text-primary-foreground shadow-elegant"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="h-5 w-5" />
              )}
              {loading ? "Gerando imagem..." : "Gerar imagem com IA"}
            </Button>
            <p className="text-xs text-muted-foreground">
              A criação fica salva para você. Só vai para a biblioteca quando você enviar.
            </p>
          </div>

          <Step n={4} title="Últimas criações">
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

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/40 p-2">
                          <div className="text-muted-foreground">Qualidade</div>
                          <div className="font-semibold">{qualityLabels[creation.quality]}</div>
                        </div>
                        <div className="rounded-md bg-muted/40 p-2">
                          <div className="text-muted-foreground">Criada em</div>
                          <div className="font-semibold">{formatDate(creation.createdAt)}</div>
                        </div>
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

        <aside className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Diretrizes da Marca</CardTitle>
              {canViewBrandKit ? (
                <a className="text-xs text-primary hover:underline" href="/brand-plen/kit">
                  Ver todas
                </a>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Cores oficiais
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {brandColors.map((c) => (
                    <div key={c.hex} className="space-y-1">
                      <div
                        className="aspect-square rounded-md border"
                        style={{ background: c.hex }}
                      />
                      <div className="font-mono text-[10px] text-muted-foreground">{c.hex}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Estilo
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visualStyles.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gold/30 bg-gold/5 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-gold" />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Prompt mestre da marca</div>
                  <p className="mt-1 text-muted-foreground">
                    A IA recebe a paleta, o tom, as regras visuais, o tipo de peça e o logo oficial
                    como referência para manter a identidade Plenarius.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Qualidade</Label>
                <Select
                  value={quality}
                  onValueChange={(value) => setQuality(value as BrandPlenGeneration["quality"])}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Rápida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">Exibir texto na imagem</Label>
                <Switch checked={showText} onCheckedChange={setShowText} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">Aplicar logo automaticamente</Label>
                <Switch checked={applyLogo} onCheckedChange={setApplyLogo} />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        As criações ficam privadas para o usuário até serem enviadas para a biblioteca da marca.
      </div>
    </div>
  );
}
