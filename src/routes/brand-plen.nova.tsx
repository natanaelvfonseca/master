import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, type ReactNode, useState } from "react";
import { Download, ImagePlus, Info, Loader2, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { canManageBrandPlen } from "@/lib/auth-types";
import { audiences, brandColors, courses, objectives, pieceTypes, visualStyles } from "@/lib/brand";
import { toast } from "sonner";

type GeneratedBrandImage = {
  id: string;
  dataUrl: string;
  revisedPrompt: string | null;
  prompt: string;
  pieceType: string;
  objective: string;
  course: string;
  size: string;
  quality: "low" | "medium" | "high";
  format: "png" | "jpeg" | "webp";
  createdAt: string;
};

type GenerateResponse = {
  images?: Array<GeneratedBrandImage>;
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

function downloadGeneratedImage(image: GeneratedBrandImage) {
  const link = document.createElement("a");
  const courseSlug = slugifyFileName(image.course) || "arte";

  link.href = image.dataUrl;
  link.download = `brand-plen-${courseSlug}-${image.id}.${image.format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function NovaCriacao() {
  const { session } = useAuth();
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
  const [quality, setQuality] = useState<GeneratedBrandImage["quality"]>("high");
  const [referenceUpload, setReferenceUpload] = useState<ReferenceUpload | null>(null);
  const [results, setResults] = useState<Array<GeneratedBrandImage>>([]);
  const [loading, setLoading] = useState(false);
  const canViewBrandKit = session ? canManageBrandPlen(session.user.role) : false;
  const selectedPiece = pieceTypes.find((p) => p.id === piece);

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

    setLoading(true);

    try {
      const logoDataUrl = applyLogo ? await loadAssetAsDataUrl(plenariusLogo) : undefined;
      const response = await fetch("/api/brand-plen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(data?.error ?? "Não foi possível gerar a imagem agora.");
      }

      setResults(data?.images ?? []);
      toast.success(`Imagem gerada com IA${data?.model ? ` usando ${data.model}` : ""}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a imagem.");
    } finally {
      setLoading(false);
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
              A imagem será criada com as diretrizes do Brand Kit e o logo oficial da Plenarius.
            </p>
          </div>

          {results.length > 0 && (
            <Step n={4} title="Resultado gerado">
              <div className="space-y-5">
                {results.map((result) => (
                  <div key={result.id} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={result.dataUrl}
                        alt={`Arte ${result.course}`}
                        className="max-h-[680px] w-full object-contain"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs uppercase text-muted-foreground">Peça</div>
                        <div className="font-semibold">
                          {selectedPiece?.label ?? result.pieceType}
                        </div>
                        <div className="mt-3 text-xs uppercase text-muted-foreground">Curso</div>
                        <div className="font-semibold">{result.course}</div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="uppercase text-muted-foreground">Tamanho</div>
                            <div className="font-semibold">{result.size}</div>
                          </div>
                          <div>
                            <div className="uppercase text-muted-foreground">Qualidade</div>
                            <div className="font-semibold">{qualityLabels[result.quality]}</div>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full gap-2 bg-primary text-primary-foreground"
                        onClick={() => downloadGeneratedImage(result)}
                      >
                        <Download className="h-4 w-4" /> Baixar imagem
                      </Button>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Prompt aplicado</Label>
                        <Textarea readOnly rows={7} value={result.prompt} className="text-xs" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Step>
          )}
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
                  onValueChange={(value) => setQuality(value as GeneratedBrandImage["quality"])}
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
        Todas as imagens geradas passam por aprovação humana antes de serem disponibilizadas na
        biblioteca da marca.
      </div>
    </div>
  );
}
