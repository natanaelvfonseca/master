import { createFileRoute } from "@tanstack/react-router";
import { upload } from "@vercel/blob/client";
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Crown,
  Film,
  GraduationCap,
  Layers3,
  Loader2,
  Lock,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { canManageTraining } from "@/lib/auth-types";
import {
  TRAINING_TRAILS,
  type TrainingLesson,
  type TrainingLessonScope,
  type TrainingSummary,
  type TrainingTrailId,
  type TrainingVideoSource,
} from "@/lib/training-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TrainingResponse = {
  lessons?: Array<TrainingLesson>;
  lesson?: TrainingLesson;
  summary?: TrainingSummary;
  canManage?: boolean;
  error?: string;
};

type UploadFormState = {
  title: string;
  description: string;
  trail: TrainingTrailId;
  durationLabel: string;
  orderIndex: string;
  scope: TrainingLessonScope;
  videoSource: TrainingVideoSource;
  videoUrl: string;
  videoFile: File | null;
  thumbnailFile: File | null;
};

const initialUploadForm: UploadFormState = {
  title: "",
  description: "",
  trail: "plataforma",
  durationLabel: "",
  orderIndex: "0",
  scope: "global",
  videoSource: "upload",
  videoUrl: "",
  videoFile: null,
  thumbnailFile: null,
};

const TRAINING_UPLOAD_URL = "/api/training/upload";
const MAX_VIDEO_UPLOAD_BYTES = 1024 * 1024 * 1024;
const MAX_THUMBNAIL_UPLOAD_BYTES = 10 * 1024 * 1024;

const trailStyles: Record<TrainingTrailId, { ring: string; glow: string; icon: typeof Sparkles }> =
  {
    plataforma: {
      ring: "from-[#3F73D8] to-[#DCE8FF]",
      glow: "shadow-[0_20px_80px_-46px_rgba(63,115,216,0.95)]",
      icon: Layers3,
    },
    vendas: {
      ring: "from-[#E3AA2B] to-[#FFFFFF]",
      glow: "shadow-[0_20px_80px_-46px_rgba(227,170,43,0.95)]",
      icon: Crown,
    },
    escola: {
      ring: "from-[#1746B8] to-[#3F73D8]",
      glow: "shadow-[0_20px_80px_-46px_rgba(23,70,184,0.95)]",
      icon: GraduationCap,
    },
    lideranca: {
      ring: "from-[#0B2A6F] to-[#E3AA2B]",
      glow: "shadow-[0_20px_80px_-46px_rgba(11,42,111,0.95)]",
      icon: ShieldCheck,
    },
  };

export const Route = createFileRoute("/treinamentos")({
  head: () => ({ meta: [{ title: "Área de Membros · Treinamentos" }] }),
  component: Treinamentos,
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function getTrail(trailId: TrainingTrailId) {
  return TRAINING_TRAILS.find((trail) => trail.id === trailId) ?? TRAINING_TRAILS[0];
}

function buildVideoSrc(lesson: TrainingLesson, unitId: string) {
  if (lesson.videoSource === "url" && lesson.videoUrl) {
    return lesson.videoUrl;
  }

  const params = new URLSearchParams({ id: lesson.id, unitId });

  return `/api/training/video?${params.toString()}`;
}

function validateVideoFile(file: File) {
  if (!file.type.startsWith("video/")) {
    toast.error("Selecione um vídeo válido.");
    return false;
  }

  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    toast.error("O vídeo precisa ter até 1 GB.");
    return false;
  }

  return true;
}

function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    toast.error("Selecione uma imagem válida.");
    return false;
  }

  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
    toast.error("A capa precisa ter até 10 MB.");
    return false;
  }

  return true;
}

function getSafeFileName(file: File) {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? "";
  const baseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "arquivo";

  return extension ? `${baseName}.${extension}` : baseName;
}

async function uploadTrainingAsset(
  file: File,
  kind: "video" | "thumbnail",
  onProgress: (percentage: number) => void,
) {
  const blob = await upload(`treinamentos/${kind}/${Date.now()}-${getSafeFileName(file)}`, file, {
    access: "public",
    contentType: file.type,
    handleUploadUrl: TRAINING_UPLOAD_URL,
    multipart: kind === "video",
    clientPayload: JSON.stringify({ kind }),
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });

  return blob.url;
}

function TrainingPlaceholder({ trail }: { trail: TrainingTrailId }) {
  const trailStyle = trailStyles[trail];
  const Icon = trailStyle.icon;

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#0B2A6F_0%,#1746B8_50%,#3F73D8_100%)] text-white",
        trailStyle.glow,
      )}
    >
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
        <Icon className="h-7 w-7" />
      </div>
    </div>
  );
}

function UploadDialog({
  activeUnitId,
  open,
  onOpenChange,
  onUploaded,
}: {
  activeUnitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (lesson: TrainingLesson) => void;
}) {
  const [form, setForm] = useState<UploadFormState>(initialUploadForm);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const updateForm = (patch: Partial<UploadFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file || !validateVideoFile(file)) {
      return;
    }

    updateForm({ videoFile: file });
  };

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file || !validateImageFile(file)) {
      return;
    }

    updateForm({ thumbnailFile: file });
  };

  const submit = async () => {
    if (!activeUnitId) {
      toast.error("Selecione uma unidade ativa antes de publicar.");
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.durationLabel.trim()) {
      toast.error("Preencha título, descrição e duração.");
      return;
    }

    if (form.videoSource === "upload" && !form.videoFile) {
      toast.error("Envie o vídeo da aula.");
      return;
    }

    if (form.videoSource === "url" && !form.videoUrl.trim()) {
      toast.error("Informe a URL do vídeo.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let videoUrl = form.videoUrl.trim();
      let videoFileName = "video-url";
      let videoMimeType = "video/mp4";
      let thumbnailDataUrl: string | null = null;

      if (form.videoSource === "upload" && form.videoFile) {
        setUploadStep("Enviando vídeo da aula");
        videoUrl = await uploadTrainingAsset(form.videoFile, "video", setUploadProgress);
        videoFileName = form.videoFile.name;
        videoMimeType = form.videoFile.type || "video/mp4";
      }

      if (form.thumbnailFile) {
        setUploadStep("Enviando capa da aula");
        setUploadProgress(0);
        thumbnailDataUrl = await uploadTrainingAsset(
          form.thumbnailFile,
          "thumbnail",
          setUploadProgress,
        );
      }

      setUploadStep("Publicando na trilha");
      setUploadProgress(100);

      const data = await readJson<TrainingResponse>(
        await fetch("/api/training", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId: activeUnitId,
            title: form.title,
            description: form.description,
            trail: form.trail,
            durationLabel: form.durationLabel,
            orderIndex: form.orderIndex,
            scope: form.scope,
            videoSource: "url",
            videoUrl,
            videoFileName,
            videoMimeType,
            thumbnailDataUrl,
          }),
        }),
      );

      if (data.lesson) {
        onUploaded(data.lesson);
      }

      toast.success("Aula publicada na área de membros.");
      setForm(initialUploadForm);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao publicar aula.");
    } finally {
      setUploading(false);
      setUploadStep("");
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !uploading && onOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gold text-[#0B2A6F] hover:bg-gold/90">
          <Plus className="h-4 w-4" /> Nova aula
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar aula</DialogTitle>
          <DialogDescription>
            Curadoria de conteúdos para a trilha de aprendizagem da equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              placeholder="Ex: Como registrar uma matrícula no CRM"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trilha</Label>
            <Select
              value={form.trail}
              onValueChange={(value) => updateForm({ trail: value as TrainingTrailId })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_TRAILS.map((trail) => (
                  <SelectItem key={trail.id} value={trail.id}>
                    {trail.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Visibilidade</Label>
            <Select
              value={form.scope}
              onValueChange={(value) => updateForm({ scope: value as TrainingLessonScope })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Todas as unidades</SelectItem>
                <SelectItem value="unit">Unidade ativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Duração</Label>
            <Input
              value={form.durationLabel}
              onChange={(event) => updateForm({ durationLabel: event.target.value })}
              placeholder="Ex: 12 min"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ordem na trilha</Label>
            <Input
              type="number"
              value={form.orderIndex}
              onChange={(event) => updateForm({ orderIndex: event.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              placeholder="Resumo objetivo do que o time vai aprender nesta aula."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Origem do vídeo</Label>
            <Select
              value={form.videoSource}
              onValueChange={(value) => updateForm({ videoSource: value as TrainingVideoSource })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">Upload MP4/WebM</SelectItem>
                <SelectItem value="url">URL HTTPS direta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.videoSource === "upload" ? (
            <div className="space-y-1.5">
              <Label>Vídeo da aula</Label>
              <input
                id="training-video-upload"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleVideoChange}
              />
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <label htmlFor="training-video-upload">
                  <Upload className="h-4 w-4" />
                  {form.videoFile ? form.videoFile.name : "Selecionar vídeo"}
                </label>
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>URL do vídeo</Label>
              <Input
                value={form.videoUrl}
                onChange={(event) => updateForm({ videoUrl: event.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Capa da aula</Label>
            <input
              id="training-thumbnail-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <label htmlFor="training-thumbnail-upload">
                <Upload className="h-4 w-4" />
                {form.thumbnailFile ? form.thumbnailFile.name : "Selecionar capa"}
              </label>
            </Button>
          </div>
        </div>

        {uploading ? (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadStep || "Preparando publicação"}
              </div>
              <span className="font-black text-primary">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Mantenha esta janela aberta enquanto o vídeo é enviado.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={uploading} className="gap-2 bg-primary text-white">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Publicar aula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Treinamentos() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = session?.activeUnit?.name ?? "Unidade ativa";
  const canManage = session ? canManageTraining(session.user.role) : false;
  const [lessons, setLessons] = useState<Array<TrainingLesson>>([]);
  const [summary, setSummary] = useState<TrainingSummary>({
    totalLessons: 0,
    completedLessons: 0,
    progressPercent: 0,
  });
  const [selectedTrail, setSelectedTrail] = useState<TrainingTrailId>("plataforma");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId) ?? lessons[0] ?? null,
    [lessons, selectedLessonId],
  );
  const lessonsByTrail = useMemo(
    () =>
      TRAINING_TRAILS.reduce(
        (acc, trail) => {
          acc[trail.id] = lessons.filter((lesson) => lesson.trail === trail.id);
          return acc;
        },
        {} as Record<TrainingTrailId, Array<TrainingLesson>>,
      ),
    [lessons],
  );
  const activeTrail = getTrail(selectedTrail);
  const activeTrailLessons = lessonsByTrail[selectedTrail] ?? [];

  const loadTraining = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!activeUnitId) {
        setLessons([]);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await readJson<TrainingResponse>(
          await fetch(`/api/training${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );
        const nextLessons = data.lessons ?? [];

        setLessons(nextLessons);
        setSummary(
          data.summary ?? {
            totalLessons: nextLessons.length,
            completedLessons: nextLessons.filter((lesson) => lesson.completedAt).length,
            progressPercent: 0,
          },
        );

        if (!selectedLessonId && nextLessons[0]) {
          setSelectedLessonId(nextLessons[0].id);
          setSelectedTrail(nextLessons[0].trail);
        }
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar treinamentos.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [activeUnitId, selectedLessonId],
  );

  useEffect(() => {
    void loadTraining();
  }, [loadTraining]);

  const updateProgress = async (lesson: TrainingLesson, completed: boolean) => {
    if (!activeUnitId) {
      return;
    }

    setSavingProgress(true);

    try {
      const data = await readJson<TrainingResponse>(
        await fetch("/api/training", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ unitId: activeUnitId, lessonId: lesson.id, completed }),
        }),
      );

      setLessons(data.lessons ?? []);
      if (data.summary) {
        setSummary(data.summary);
      }
      toast.success(completed ? "Aula concluída." : "Conclusão removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar progresso.");
    } finally {
      setSavingProgress(false);
    }
  };

  const archiveLesson = async (lesson: TrainingLesson) => {
    setArchivingId(lesson.id);

    try {
      await readJson<{ ok: boolean }>(
        await fetch("/api/training", {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lessonId: lesson.id }),
        }),
      );
      toast.success("Aula arquivada.");
      void loadTraining({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao arquivar aula.");
    } finally {
      setArchivingId(null);
    }
  };

  const handleUploaded = (lesson: TrainingLesson) => {
    setLessons((current) => [lesson, ...current]);
    setSelectedLessonId(lesson.id);
    setSelectedTrail(lesson.trail);
    void loadTraining({ silent: true });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,#061B4D_0%,#0B2A6F_38%,#1746B8_74%,#3F73D8_100%)] p-5 text-white shadow-[0_30px_90px_-50px_rgba(11,42,111,0.95)] md:p-7">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute left-0 top-0 h-px w-full animate-pulse bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div className="max-w-3xl">
            <Badge className="border-white/20 bg-white/10 text-white">
              <BookOpenCheck className="mr-1 h-3.5 w-3.5" /> Área de Membros
            </Badge>
            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
              Trilha de aprendizagem Plenarius
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78 md:text-base">
              Treinamento para plataforma, vendas, escola e liderança, organizado para evoluir o
              time com consistência.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge className="border-gold/30 bg-gold/15 text-gold">{activeUnitName}</Badge>
              <Badge className="border-white/15 bg-white/10 text-white">
                {summary.completedLessons}/{summary.totalLessons} aulas concluídas
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">Progresso</div>
                <div className="mt-1 text-3xl font-black">{summary.progressPercent}%</div>
              </div>
              <div
                className="grid h-20 w-20 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#E3AA2B ${summary.progressPercent * 3.6}deg, rgba(255,255,255,.15) 0deg)`,
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0B2A6F]">
                  <Sparkles className="h-5 w-5 text-gold" />
                </div>
              </div>
            </div>
            <Progress
              value={summary.progressPercent}
              className="mt-4 bg-white/15 [&>div]:bg-gold"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 gap-2 bg-white text-[#0B2A6F] hover:bg-white/90"
                onClick={() => loadTraining()}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Atualizar
              </Button>
              {canManage ? (
                <UploadDialog
                  activeUnitId={activeUnitId}
                  open={uploadOpen}
                  onOpenChange={setUploadOpen}
                  onUploaded={handleUploaded}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            {TRAINING_TRAILS.map((trail) => {
              const Icon = trailStyles[trail.id].icon;
              const trailLessons = lessonsByTrail[trail.id] ?? [];
              const completed = trailLessons.filter((lesson) => lesson.completedAt).length;
              const active = selectedTrail === trail.id;

              return (
                <button
                  key={trail.id}
                  type="button"
                  onClick={() => setSelectedTrail(trail.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-elegant",
                    active && "border-primary shadow-elegant",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                      trailStyles[trail.id].ring,
                    )}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                        trailStyles[trail.id].ring,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {completed}/{trailLessons.length}
                    </Badge>
                  </div>
                  <div className="mt-4 text-sm font-black">{trail.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{trail.subtitle}</div>
                </button>
              );
            })}
          </div>

          <Card className="overflow-hidden shadow-card">
            <CardHeader className="border-b bg-[linear-gradient(90deg,rgba(11,42,111,.06),rgba(63,115,216,.12),rgba(227,170,43,.08))]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    {activeTrail.title}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{activeTrail.description}</p>
                </div>
                <Badge className="w-fit border-primary/20 bg-primary/10 text-primary">
                  {activeTrailLessons.length} aulas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeTrailLessons.length ? (
                <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[29px] before:top-5 before:w-px before:bg-gradient-to-b before:from-primary before:via-primary/30 before:to-transparent">
                  {activeTrailLessons.map((lesson, index) => {
                    const selected = selectedLesson?.id === lesson.id;
                    const completed = Boolean(lesson.completedAt);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={cn(
                          "group relative grid w-full grid-cols-[58px_minmax(0,1fr)] gap-3 rounded-xl border bg-card p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant",
                          selected && "border-primary shadow-elegant",
                        )}
                      >
                        <div className="relative z-10">
                          <div
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-full border-4 border-background text-sm font-black shadow-card",
                              completed
                                ? "bg-success text-white"
                                : selected
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
                          {lesson.thumbnailDataUrl ? (
                            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                              <img
                                src={lesson.thumbnailDataUrl}
                                alt=""
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <TrainingPlaceholder trail={lesson.trail} />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  completed
                                    ? "border-success/30 bg-success/10 text-success"
                                    : "border-primary/20 bg-primary/10 text-primary"
                                }
                              >
                                {completed ? "Concluída" : "Disponível"}
                              </Badge>
                              <Badge variant="secondary" className="gap-1">
                                <Clock3 className="h-3 w-3" /> {lesson.durationLabel}
                              </Badge>
                              <Badge variant="secondary">
                                {lesson.scope === "global" ? "Todas as unidades" : "Unidade"}
                              </Badge>
                            </div>
                            <h3 className="mt-2 line-clamp-2 font-black leading-tight">
                              {lesson.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {lesson.description}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                              <Film className="h-3.5 w-3.5" />
                              Publicada em {formatDate(lesson.createdAt)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed bg-accent/20 p-6 text-center">
                  {loading ? (
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                  ) : (
                    <BookOpenCheck className="h-9 w-9 text-muted-foreground" />
                  )}
                  <div className="mt-3 text-sm font-bold">
                    {loading ? "Carregando trilha..." : "Trilha aguardando aulas"}
                  </div>
                  <p className="mt-1 max-w-[300px] text-xs text-muted-foreground">
                    As aulas publicadas pela liderança aparecem aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <Card className="overflow-hidden border-primary/20 shadow-elegant">
            {selectedLesson ? (
              <>
                <div className="relative bg-[#061B4D]">
                  <video
                    key={selectedLesson.id}
                    className="aspect-video w-full bg-black"
                    controls
                    poster={selectedLesson.thumbnailDataUrl ?? undefined}
                    src={buildVideoSrc(selectedLesson, activeUnitId)}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
                </div>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/10 text-primary">
                        {getTrail(selectedLesson.trail).title}
                      </Badge>
                      <Badge variant="secondary">{selectedLesson.durationLabel}</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-black leading-tight">
                      {selectedLesson.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedLesson.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-muted-foreground">Status</div>
                      <div className="mt-1 font-bold">
                        {selectedLesson.completedAt ? "Concluída" : "Em andamento"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-muted-foreground">Publicado</div>
                      <div className="mt-1 font-bold">{formatDate(selectedLesson.createdAt)}</div>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full gap-2",
                      selectedLesson.completedAt
                        ? "bg-success text-white hover:bg-success/90"
                        : "bg-primary text-white",
                    )}
                    onClick={() => updateProgress(selectedLesson, !selectedLesson.completedAt)}
                    disabled={savingProgress}
                  >
                    {savingProgress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedLesson.completedAt ? (
                      <BadgeCheck className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {selectedLesson.completedAt ? "Concluída" : "Marcar como concluída"}
                  </Button>

                  {canManage ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-muted-foreground"
                      onClick={() => archiveLesson(selectedLesson)}
                      disabled={archivingId === selectedLesson.id}
                    >
                      {archivingId === selectedLesson.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Arquivar aula
                    </Button>
                  ) : null}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Play className="h-7 w-7" />
                </div>
                <div className="mt-4 text-base font-black">Player da trilha</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Selecione uma aula para começar o treinamento.
                </p>
              </CardContent>
            )}
          </Card>

          <Card className="border-gold/30 bg-gold/5 shadow-card">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <Lock className="mt-0.5 h-4 w-4 text-gold" />
              <div>
                <div className="font-bold">Curadoria da liderança</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Master e CEO publicam aulas. A equipe acompanha a trilha e registra o avanço.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
