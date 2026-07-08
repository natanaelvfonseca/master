import { createFileRoute } from "@tanstack/react-router";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brandColors, pieceTypes } from "@/lib/brand";
import {
  buildDefaultBrandPlenSettings,
  MAX_BRAND_PLEN_REFERENCES_PER_TYPE,
  type BrandPlenReferenceImage,
  type BrandPlenSettings,
} from "@/lib/brand-plen-settings";
import type { BrandImageQuality } from "@/lib/generateBrandImage";
import { useAuth } from "@/lib/auth";
import { canManageBrandPlen } from "@/lib/auth-types";
import masterLogo from "@/assets/master-logo.png";
import { toast } from "sonner";

type SettingsResponse = {
  settings?: BrandPlenSettings;
  error?: string;
};

const qualityLabels: Record<BrandImageQuality, string> = {
  high: "Alta",
  medium: "Média",
  low: "Rápida",
};

export const Route = createFileRoute("/brand-plen/kit")({
  head: () => ({ meta: [{ title: "Brand Kit · Brand Plen" }] }),
  component: BrandKit,
});

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

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function splitRules(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createReferenceImage(file: File, dataUrl: string): BrandPlenReferenceImage {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type,
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

function BrandKit() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = session?.activeUnit?.name ?? "Unidade ativa";
  const [settings, setSettings] = useState<BrandPlenSettings>(() =>
    buildDefaultBrandPlenSettings(activeUnitId),
  );
  const [requiredText, setRequiredText] = useState("");
  const [forbiddenText, setForbiddenText] = useState("");
  const [selectedPiece, setSelectedPiece] = useState(pieceTypes[0]?.id ?? "post");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedPieceLabel = useMemo(
    () => pieceTypes.find((piece) => piece.id === selectedPiece)?.label ?? "Tipo selecionado",
    [selectedPiece],
  );
  const selectedReferences = settings.referencesByPieceType[selectedPiece] ?? [];

  const setLoadedSettings = useCallback((nextSettings: BrandPlenSettings) => {
    setSettings(nextSettings);
    setRequiredText(nextSettings.requiredRules.join("\n"));
    setForbiddenText(nextSettings.forbiddenRules.join("\n"));
  }, []);

  const loadSettings = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!activeUnitId || !session || !canManageBrandPlen(session.user.role)) {
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await readJson<SettingsResponse>(
          await fetch(`/api/brand-plen/settings${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        if (data.settings) {
          setLoadedSettings(data.settings);
        }
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar configurações.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [activeUnitId, session, setLoadedSettings],
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (session && !canManageBrandPlen(session.user.role)) {
    return <BrandAdminAccessDenied />;
  }

  const updateSettings = (patch: Partial<BrandPlenSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return false;
    }

    if (file.size > 6 * 1024 * 1024) {
      toast.error("A imagem precisa ter até 6 MB.");
      return false;
    }

    return true;
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !validateImageFile(file)) {
      return;
    }

    try {
      updateSettings({ logoDataUrl: await readBlobAsDataUrl(file) });
      toast.success("Logo atualizado para as próximas gerações.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o logo.");
    }
  };

  const handleReferenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !validateImageFile(file)) {
      return;
    }

    if (selectedReferences.length >= MAX_BRAND_PLEN_REFERENCES_PER_TYPE) {
      toast.error(`Use até ${MAX_BRAND_PLEN_REFERENCES_PER_TYPE} referências por tipo de criação.`);
      return;
    }

    try {
      const reference = createReferenceImage(file, await readBlobAsDataUrl(file));

      setSettings((current) => ({
        ...current,
        referencesByPieceType: {
          ...current.referencesByPieceType,
          [selectedPiece]: [...(current.referencesByPieceType[selectedPiece] ?? []), reference],
        },
      }));
      toast.success("Referência adicionada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível carregar a referência.",
      );
    }
  };

  const removeReference = (id: string) => {
    setSettings((current) => ({
      ...current,
      referencesByPieceType: {
        ...current.referencesByPieceType,
        [selectedPiece]: (current.referencesByPieceType[selectedPiece] ?? []).filter(
          (reference) => reference.id !== id,
        ),
      },
    }));
  };

  const saveSettings = async () => {
    if (!activeUnitId) {
      toast.error("Selecione uma unidade ativa antes de salvar.");
      return;
    }

    setSaving(true);

    try {
      const payload: BrandPlenSettings = {
        ...settings,
        unitId: activeUnitId,
        requiredRules: splitRules(requiredText),
        forbiddenRules: splitRules(forbiddenText),
      };
      const data = await readJson<SettingsResponse>(
        await fetch("/api/brand-plen/settings", {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unitId: activeUnitId, settings: payload }),
        }),
      );

      if (data.settings) {
        setLoadedSettings(data.settings);
      }

      toast.success("Configurações do Brand Plen salvas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Plen · Administração"
        title="Brand Kit"
        description={`Configurações internas do gerador de imagem com IA para ${activeUnitName}.`}
        actions={
          <Badge className="gap-1 border-primary/20 bg-primary/10 text-primary">
            <Lock className="h-3 w-3" /> Master e Marketing
          </Badge>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-primary" /> Diretrizes do gerador
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Estilo visual da marca</Label>
                <Textarea
                  rows={5}
                  value={settings.stylePrompt}
                  onChange={(event) => updateSettings({ stylePrompt: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tom de comunicação</Label>
                <Textarea
                  rows={5}
                  value={settings.tonePrompt}
                  onChange={(event) => updateSettings({ tonePrompt: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Regras obrigatórias</Label>
                <Textarea
                  rows={7}
                  value={requiredText}
                  onChange={(event) => setRequiredText(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Regras proibidas</Label>
                <Textarea
                  rows={7}
                  value={forbiddenText}
                  onChange={(event) => setForbiddenText(event.target.value)}
                />
              </div>
              <div className="space-y-1.5 md:max-w-sm">
                <Label>Qualidade padrão</Label>
                <Select
                  value={settings.defaultQuality}
                  onValueChange={(value) =>
                    updateSettings({ defaultQuality: value as BrandImageQuality })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(qualityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Referências por tipo de criação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                {pieceTypes.map((piece) => {
                  const active = selectedPiece === piece.id;
                  const count = settings.referencesByPieceType[piece.id]?.length ?? 0;

                  return (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => setSelectedPiece(piece.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{piece.label}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {count} referência{count === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold">{selectedPieceLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    Essas imagens ajudam a IA a entender composição, acabamento e direção visual.
                  </div>
                </div>
                <div>
                  <input
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

              {selectedReferences.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {selectedReferences.map((reference) => (
                    <div key={reference.id} className="overflow-hidden rounded-lg border bg-card">
                      <div className="aspect-square bg-muted">
                        <img
                          src={reference.dataUrl}
                          alt={reference.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <div className="min-w-0 truncate text-xs font-medium">{reference.name}</div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-muted-foreground"
                          onClick={() => removeReference(reference.id)}
                          aria-label="Remover referência"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed bg-accent/20 p-6 text-center">
                  <ImageIcon className="h-9 w-9 text-muted-foreground" />
                  <div className="mt-3 text-sm font-semibold">Nenhuma referência neste tipo</div>
                  <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
                    Adicione exemplos visuais para orientar a IA nas próximas criações.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Logo obrigatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-40 items-center justify-center rounded-lg border bg-[#C2410C] p-4">
                <img
                  src={settings.logoDataUrl ?? masterLogo}
                  alt="Logo Master"
                  className="max-h-28 max-w-[88%] object-contain"
                />
              </div>
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-muted-foreground">
                O logo é enviado automaticamente em todas as gerações para manter a identidade da
                Master.
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  id="brand-logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button asChild variant="outline" className="gap-2">
                  <label htmlFor="brand-logo-upload">
                    <Upload className="h-4 w-4" /> Trocar logo
                  </label>
                </Button>
                {settings.logoDataUrl ? (
                  <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground"
                    onClick={() => updateSettings({ logoDataUrl: null })}
                  >
                    <RotateCcw className="h-4 w-4" /> Usar padrão
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Cores oficiais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {brandColors.map((color) => (
                <div key={color.hex} className="space-y-2">
                  <div
                    className="aspect-square rounded-lg border shadow-card"
                    style={{ background: color.hex }}
                  />
                  <div>
                    <div className="text-xs font-semibold">{color.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{color.hex}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="space-y-3 p-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-success" />
                Diretrizes e referências são aplicadas automaticamente na Nova Criação.
              </div>
              <div className="flex items-start gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 text-destructive" />
                Usuários finais não veem prompt, logo, qualidade ou referências técnicas.
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-primary" />
                As configurações são individuais por unidade ativa.
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">
          {loading
            ? "Carregando configurações..."
            : settings.updatedAt
              ? `Última atualização: ${new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(settings.updatedAt))}`
              : "Configurações padrão carregadas."}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => loadSettings()}
            disabled={loading || saving}
          >
            <RotateCcw className="h-4 w-4" /> Descartar alterações
          </Button>
          <Button
            className="gap-2 bg-primary text-primary-foreground"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Brand Kit
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrandAdminAccessDenied() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O Brand Kit e as configurações do gerador ficam disponíveis para Master e Marketing.
        </p>
      </div>
    </div>
  );
}
