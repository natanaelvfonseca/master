import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Crown,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { canManageTraining, canViewLeadershipTraining } from "@/lib/auth-types";
import {
  TRAINING_TRAILS,
  type TrainingLesson,
  type TrainingLessonScope,
  type TrainingSummary,
  type TrainingTrailId,
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
  videoUrl: string;
};

type EditFormState = Pick<
  UploadFormState,
  "title" | "description" | "trail" | "durationLabel" | "orderIndex" | "scope"
>;

const initialUploadForm: UploadFormState = {
  title: "",
  description: "",
  trail: "plataforma",
  durationLabel: "",
  orderIndex: "0",
  scope: "global",
  videoUrl: "",
};

const PLAYBACK_RATES = ["0.75", "1", "1.25", "1.5", "2"] as const;

const trailStyles: Record<
  TrainingTrailId,
  { accent: string; soft: string; icon: typeof Sparkles }
> = {
  plataforma: {
    accent: "bg-[#f97316]",
    soft: "bg-[#fff0e5]",
    icon: Layers3,
  },
  vendas: {
    accent: "bg-[#1236c9]",
    soft: "bg-[#e9edff]",
    icon: Crown,
  },
  escola: {
    accent: "bg-[#f6cf62]",
    soft: "bg-[#fff8df]",
    icon: GraduationCap,
  },
  lideranca: {
    accent: "bg-[#c2410c]",
    soft: "bg-[#ffebe2]",
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

function sortLessons(lessons: Array<TrainingLesson>) {
  const trailOrder = new Map(TRAINING_TRAILS.map((trail, index) => [trail.id, index]));

  return [...lessons].sort(
    (a, b) =>
      (trailOrder.get(a.trail) ?? 0) - (trailOrder.get(b.trail) ?? 0) ||
      a.orderIndex - b.orderIndex ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function buildVideoSrc(lesson: TrainingLesson, unitId: string) {
  if (lesson.videoSource === "url" && lesson.videoUrl) {
    return lesson.videoUrl;
  }

  const params = new URLSearchParams({ id: lesson.id, unitId });

  return `/api/training/video?${params.toString()}`;
}

function getYouTubeVideoId(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate = "";

    if (host === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") {
        candidate = url.searchParams.get("v") ?? "";
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) {
          candidate = parts[1] ?? "";
        }
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function buildYouTubeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    controls: "1",
    playsinline: "1",
    rel: "0",
  });

  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function TrainingPlaceholder({ trail }: { trail: TrainingTrailId }) {
  const trailStyle = trailStyles[trail];
  const Icon = trailStyle.icon;

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden border-2 border-[#071a42] bg-[#071a42] text-white">
      <div className={cn("absolute inset-y-0 left-0 w-2", trailStyle.accent)} />
      <div className="absolute right-3 top-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
        Master / Aula
      </div>
      <div className={cn("relative flex h-14 w-14 items-center justify-center text-[#071a42]", trailStyle.soft)}>
        <Icon className="h-6 w-6" />
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

  const updateForm = (patch: Partial<UploadFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
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

    const youtubeVideoId = getYouTubeVideoId(form.videoUrl);

    if (!youtubeVideoId) {
      toast.error("Informe um link válido do YouTube.");
      return;
    }

    setUploading(true);

    try {
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
            videoUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
            videoFileName: `youtube-${youtubeVideoId}`,
            videoMimeType: "video/youtube",
            thumbnailDataUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !uploading && onOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gold text-[#C2410C] hover:bg-gold/90">
          <Plus className="h-4 w-4" /> Nova aula
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar aula</DialogTitle>
          <DialogDescription>
            Cole o link de um vídeo do YouTube para publicar sem consumir o armazenamento da plataforma.
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
              min="0"
              value={form.orderIndex}
              onChange={(event) => updateForm({ orderIndex: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">O menor número aparece primeiro.</p>
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
          <div className="space-y-1.5 md:col-span-2">
            <Label>Link do vídeo no YouTube</Label>
            <div className="relative">
              <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-600" />
              <Input
                value={form.videoUrl}
                onChange={(event) => updateForm({ videoUrl: event.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Aceita links youtube.com, youtu.be, Shorts e transmissões. A capa será preenchida automaticamente.
            </p>
          </div>
        </div>

        {uploading ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm font-bold text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Publicando aula na trilha
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
              <Youtube className="h-4 w-4" />
            )}
            Publicar aula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditLessonDialog({
  activeUnitId,
  lesson,
  open,
  onOpenChange,
  onUpdated,
}: {
  activeUnitId: string;
  lesson: TrainingLesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (response: TrainingResponse) => void;
}) {
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lesson || !open) return;

    setForm({
      title: lesson.title,
      description: lesson.description,
      trail: lesson.trail,
      durationLabel: lesson.durationLabel,
      orderIndex: String(lesson.orderIndex),
      scope: lesson.scope,
    });
  }, [lesson, open]);

  const updateForm = (patch: Partial<EditFormState>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
  };

  const submit = async () => {
    if (!lesson || !form) return;

    if (!form.title.trim() || !form.description.trim() || !form.durationLabel.trim()) {
      toast.error("Preencha título, descrição e duração.");
      return;
    }

    setSaving(true);

    try {
      const data = await readJson<TrainingResponse>(
        await fetch("/api/training", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateLesson",
            unitId: activeUnitId,
            lessonId: lesson.id,
            ...form,
          }),
        }),
      );

      onUpdated(data);
      onOpenChange(false);
      toast.success("Aula atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao editar aula.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar aula</DialogTitle>
          <DialogDescription>
            Ajuste as informações e a posição da aula sem reenviar o vídeo.
          </DialogDescription>
        </DialogHeader>

        {form ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(event) => updateForm({ title: event.target.value })}
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
              />
            </div>
            <div className="space-y-1.5">
              <Label>Posição na trilha</Label>
              <Input
                type="number"
                min="0"
                value={form.orderIndex}
                onChange={(event) => updateForm({ orderIndex: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">O menor número aparece primeiro.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Salvar alterações
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
  const canViewLeadership = session ? canViewLeadershipTraining(session.user.role) : false;  const visibleTrails = useMemo(
    () => TRAINING_TRAILS.filter((trail) => trail.id !== "lideranca" || canViewLeadership),
    [canViewLeadership],
  );
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
  const [editOpen, setEditOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState("1");
  const [lessonSearch, setLessonSearch] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selectedLessonIdRef = useRef<string | null>(null);
  const hasInitializedTrainingRef = useRef(false);

  const selectedLesson = useMemo(
    () =>
      (selectedLessonId ? lessons.find((lesson) => lesson.id === selectedLessonId) : null) ??
      lessons.find((lesson) => lesson.trail === selectedTrail) ??
      null,
    [lessons, selectedLessonId, selectedTrail],
  );
  const selectedYouTubeVideoId = getYouTubeVideoId(selectedLesson?.videoUrl);
  const lessonsByTrail = useMemo(
    () =>
      visibleTrails.reduce(
        (acc, trail) => {
          acc[trail.id] = lessons.filter((lesson) => lesson.trail === trail.id);
          return acc;
        },
        {} as Record<TrainingTrailId, Array<TrainingLesson>>,
      ),
    [lessons, visibleTrails],
  );
  const activeTrail = getTrail(selectedTrail);
  const activeTrailLessons = useMemo(
    () => lessonsByTrail[selectedTrail] ?? [],
    [lessonsByTrail, selectedTrail],
  );
  const filteredTrailLessons = useMemo(() => {
    const search = lessonSearch.trim().toLowerCase();

    if (!search) {
      return activeTrailLessons;
    }

    return activeTrailLessons.filter((lesson) =>
      `${lesson.title} ${lesson.description}`.toLowerCase().includes(search),
    );
  }, [activeTrailLessons, lessonSearch]);
  const nextLesson = activeTrailLessons.find((lesson) => !lesson.completedAt) ?? null;

  const selectTrail = (trailId: TrainingTrailId) => {
    const firstLesson = lessonsByTrail[trailId]?.[0] ?? null;

    selectedLessonIdRef.current = firstLesson?.id ?? null;
    setSelectedTrail(trailId);
    setSelectedLessonId(firstLesson?.id ?? null);
    setLessonSearch("");
  };

  useEffect(() => {
    selectedLessonIdRef.current = selectedLessonId;
  }, [selectedLessonId]);

  useEffect(() => {
    hasInitializedTrainingRef.current = false;
    selectedLessonIdRef.current = null;
    setSelectedLessonId(null);
    setSelectedTrail("plataforma");
  }, [activeUnitId]);

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
        const nextLessons = sortLessons(data.lessons ?? []);

        setLessons(nextLessons);
        setSummary(
          data.summary ?? {
            totalLessons: nextLessons.length,
            completedLessons: nextLessons.filter((lesson) => lesson.completedAt).length,
            progressPercent: 0,
          },
        );

        const selectedStillExists = nextLessons.some(
          (lesson) => lesson.id === selectedLessonIdRef.current,
        );

        if (!hasInitializedTrainingRef.current && nextLessons[0]) {
          selectedLessonIdRef.current = nextLessons[0].id;
          setSelectedLessonId(nextLessons[0].id);
          setSelectedTrail(nextLessons[0].trail);
          hasInitializedTrainingRef.current = true;
        } else if (selectedLessonIdRef.current && !selectedStillExists) {
          selectedLessonIdRef.current = null;
          setSelectedLessonId(null);
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
    [activeUnitId],
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

      setLessons(sortLessons(data.lessons ?? []));
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
    setLessons((current) => sortLessons([...current, lesson]));
    selectedLessonIdRef.current = lesson.id;
    setSelectedLessonId(lesson.id);
    setSelectedTrail(lesson.trail);
    void loadTraining({ silent: true });
  };

  const handleUpdated = (data: TrainingResponse) => {
    const nextLessons = sortLessons(data.lessons ?? []);
    setLessons(nextLessons);

    if (data.summary) {
      setSummary(data.summary);
    }

    if (data.lesson) {
      selectedLessonIdRef.current = data.lesson.id;
      setSelectedLessonId(data.lesson.id);
      setSelectedTrail(data.lesson.trail);
    }
  };

  const changePlaybackRate = (value: string) => {
    setPlaybackRate(value);

    if (videoRef.current) {
      videoRef.current.playbackRate = Number(value);
    }
  };

  return (
    <div
      className="relative -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f3eee7] text-[#071a42] md:-m-6 lg:-m-8"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(7,26,66,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(7,26,66,.04) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <main className="relative mx-auto max-w-[1520px] px-4 py-5 md:px-7 md:py-7 lg:px-10 lg:py-9">
        <header className="border-2 border-[#071a42] bg-[#fffaf5] shadow-[8px_8px_0_#071a42]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              <div className="absolute -right-10 -top-16 text-[180px] font-black leading-none tracking-[-0.12em] text-[#071a42]/[0.035]">
                M
              </div>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em]">
                  <span className="bg-[#f97316] px-3 py-1.5 text-white">Academia Master</span>
                  <span className="text-[#071a42]/50">{activeUnitName}</span>
                </div>
                <h1 className="mt-7 max-w-4xl text-[clamp(2.6rem,6vw,6.2rem)] font-black uppercase leading-[0.82] tracking-[-0.075em]">
                  Aprender.
                  <br />
                  Aplicar. Vender.
                </h1>
                <p className="mt-6 max-w-2xl text-sm leading-6 text-[#071a42]/65 sm:text-base">
                  Uma sequência prática para dominar o sistema, o atendimento e a cultura da escola.
                  Cada aula concluída deixa a próxima ação mais clara.
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadTraining()}
                    disabled={loading}
                    className="border-[#071a42] bg-transparent text-[#071a42] hover:bg-[#071a42] hover:text-white"
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                    Atualizar
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

            <div className="flex flex-col justify-between border-t-2 border-[#071a42] bg-[#1236c9] p-6 text-white lg:border-l-2 lg:border-t-0 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    Seu avanço
                  </div>
                  <div className="mt-3 text-6xl font-black leading-none tracking-[-0.08em]">
                    {summary.progressPercent}%
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center border-2 border-[#f6cf62] text-[#f6cf62]">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-10">
                <div className="h-3 border border-white/35 p-0.5">
                  <div
                    className="h-full bg-[#f6cf62] transition-[width] duration-500"
                    style={{ width: `${summary.progressPercent}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs font-bold text-white/65">
                  <span>{summary.completedLessons} concluídas</span>
                  <span>{Math.max(summary.totalLessons - summary.completedLessons, 0)} restantes</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          aria-label="Resumo dos treinamentos"
          className="mt-8 grid border-y-2 border-[#071a42] bg-white/55 sm:grid-cols-3"
        >
          {[
            { label: "Biblioteca", value: summary.totalLessons, detail: "aulas disponíveis" },
            { label: "Concluídas", value: summary.completedLessons, detail: "aulas finalizadas" },
            { label: "Trilhas abertas", value: visibleTrails.length, detail: "áreas de evolução" },
          ].map((metric, index) => (
            <div
              key={metric.label}
              className={cn(
                "flex items-end justify-between gap-4 px-5 py-5",
                index > 0 && "border-t border-[#071a42]/20 sm:border-l sm:border-t-0",
              )}
            >
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#071a42]/45">
                  {metric.label}
                </div>
                <div className="mt-2 text-4xl font-black leading-none tracking-[-0.06em]">
                  {metric.value}
                </div>
              </div>
              <span className="max-w-24 pb-1 text-right text-[10px] font-bold uppercase leading-4 tracking-wider text-[#f97316]">
                {metric.detail}
              </span>
            </div>
          ))}
        </section>

        <div className="mt-10 grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
            <div className="border-2 border-[#071a42] bg-[#fffaf5]">
              <div className="border-b-2 border-[#071a42] bg-[#071a42] px-5 py-4 text-white">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/50">
                  Navegação
                </div>
                <h2 className="mt-1 text-xl font-black">Trilhas</h2>
              </div>
              <nav className="grid sm:grid-cols-2 xl:grid-cols-1" aria-label="Trilhas de treinamento">
                {visibleTrails.map((trail, index) => {
                  const Icon = trailStyles[trail.id].icon;
                  const trailLessons = lessonsByTrail[trail.id] ?? [];
                  const completed = trailLessons.filter((lesson) => lesson.completedAt).length;
                  const active = selectedTrail === trail.id;

                  return (
                    <button
                      key={trail.id}
                      type="button"
                      onClick={() => selectTrail(trail.id)}
                      className={cn(
                        "group relative flex min-w-0 items-center gap-3 border-b border-[#071a42]/20 px-4 py-4 text-left transition-colors last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0 xl:[&:nth-last-child(2)]:border-b xl:last:border-b-0",
                        active ? "bg-[#f97316] text-white" : "hover:bg-[#fff0e5]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center border-2 text-sm font-black",
                          active
                            ? "border-white bg-white text-[#071a42]"
                            : "border-[#071a42] bg-[#f6cf62]",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-black">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{trail.title}</span>
                        </span>
                        <span
                          className={cn(
                            "mt-1 block truncate text-xs",
                            active ? "text-white/70" : "text-[#071a42]/50",
                          )}
                        >
                          {completed}/{trailLessons.length} concluídas
                        </span>
                      </span>
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1",
                          active ? "text-white" : "text-[#1236c9]",
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <section className="min-w-0 space-y-6">
            <div className="flex flex-col gap-3 border-b-2 border-[#071a42] pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#f97316]">
                  Trilha selecionada
                </div>
                <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">{activeTrail.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-[#071a42]/55">{activeTrail.description}</p>
              </div>
              <Button
                type="button"
                onClick={() => nextLesson && setSelectedLessonId(nextLesson.id)}
                disabled={!nextLesson}
                className="shrink-0 bg-[#1236c9] text-white hover:bg-[#0e2ba4]"
              >
                <Play className="mr-2 h-4 w-4" />
                {nextLesson ? "Continuar trilha" : "Trilha concluída"}
              </Button>
            </div>

            <article className="overflow-hidden border-2 border-[#071a42] bg-[#fffaf5] shadow-[6px_6px_0_rgba(7,26,66,.14)]">
              {selectedLesson ? (
                <>
                  <div className="flex flex-col gap-3 border-b-2 border-[#071a42] bg-[#071a42] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#f6cf62]">
                        Em exibição
                      </div>
                      <h3 className="mt-1 truncate text-lg font-black">{selectedLesson.title}</h3>
                    </div>
                    {selectedYouTubeVideoId ? (
                      <Badge className="shrink-0 border-white/15 bg-white/10 text-white hover:bg-white/10">
                        <Play className="mr-1.5 h-3.5 w-3.5 text-[#f6cf62]" />
                        Player Academia Master
                      </Badge>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-bold text-white/55">Velocidade</span>
                        <Select value={playbackRate} onValueChange={changePlaybackRate}>
                          <SelectTrigger className="h-8 w-24 border-white/25 bg-white/10 text-xs text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAYBACK_RATES.map((rate) => (
                              <SelectItem key={rate} value={rate}>
                                {rate}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#030917] p-2 sm:p-3">
                    {selectedYouTubeVideoId ? (
                      <iframe
                        key={selectedLesson.id}
                        src={buildYouTubeEmbedUrl(selectedYouTubeVideoId)}
                        title={`Aula: ${selectedLesson.title}`}
                        className="aspect-video w-full bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        key={selectedLesson.id}
                        ref={videoRef}
                        className="aspect-video w-full bg-black"
                        controls
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        disableRemotePlayback
                        onContextMenu={(event) => event.preventDefault()}
                        onDragStart={(event) => event.preventDefault()}
                        poster={selectedLesson.thumbnailDataUrl ?? undefined}
                        preload="metadata"
                        src={buildVideoSrc(selectedLesson, activeUnitId)}
                        onLoadedMetadata={(event) => {
                          event.currentTarget.playbackRate = Number(playbackRate);
                        }}
                      />
                    )}
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-7">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-[#fff0e5] text-[#c2410c]">
                          {getTrail(selectedLesson.trail).title}
                        </Badge>
                        <Badge variant="outline" className="border-[#071a42]/25">
                          <Clock3 className="mr-1 h-3 w-3" />
                          {selectedLesson.durationLabel}
                        </Badge>
                        <Badge variant="outline" className="border-[#071a42]/25">
                          {selectedLesson.scope === "global" ? "Todas as unidades" : activeUnitName}
                        </Badge>
                      </div>
                      <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.04em]">
                        {selectedLesson.title}
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#071a42]/60">
                        {selectedLesson.description}
                      </p>
                      <div className="mt-4 text-xs font-semibold text-[#071a42]/45">
                        Publicada em {formatDate(selectedLesson.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Button
                        type="button"
                        onClick={() =>
                          updateProgress(selectedLesson, !selectedLesson.completedAt)
                        }
                        disabled={savingProgress}
                        className={cn(
                          "min-w-52",
                          selectedLesson.completedAt
                            ? "bg-[#15803d] text-white hover:bg-[#166534]"
                            : "bg-[#f97316] text-white hover:bg-[#d95f0b]",
                        )}
                      >
                        {savingProgress ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : selectedLesson.completedAt ? (
                          <BadgeCheck className="mr-2 h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {selectedLesson.completedAt
                          ? "Aula concluída"
                          : "Marcar como concluída"}
                      </Button>
                      {canManage ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditOpen(true)}
                            className="border-[#071a42] text-[#071a42]"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar aula
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => archiveLesson(selectedLesson)}
                            disabled={archivingId === selectedLesson.id}
                            className="text-[#071a42]/55 hover:text-destructive"
                          >
                            {archivingId === selectedLesson.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Arquivar
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[430px] flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center bg-[#1236c9] text-white">
                    <Play className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-black">Player aguardando uma aula</h3>
                  <p className="mt-2 max-w-md text-sm text-[#071a42]/55">
                    Escolha uma aula na sequência abaixo para iniciar o treinamento.
                  </p>
                </div>
              )}
            </article>

            <section aria-labelledby="lesson-sequence-title">
              <div className="flex flex-col gap-3 border-b-2 border-[#071a42] pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#f97316]">
                    Ordem de estudo
                  </div>
                  <h2
                    id="lesson-sequence-title"
                    className="mt-1 text-2xl font-black tracking-[-0.04em]"
                  >
                    Sequência de aulas
                  </h2>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#071a42]/40" />
                  <Input
                    value={lessonSearch}
                    onChange={(event) => setLessonSearch(event.target.value)}
                    placeholder="Buscar nesta trilha..."
                    className="border-[#071a42] bg-[#fffaf5] pl-9"
                  />
                </div>
              </div>

              <div className="mt-4 border-2 border-[#071a42] bg-[#fffaf5]">
                {filteredTrailLessons.length ? (
                  filteredTrailLessons.map((lesson) => {
                    const originalIndex = activeTrailLessons.findIndex(
                      (item) => item.id === lesson.id,
                    );
                    const selected = selectedLesson?.id === lesson.id;
                    const completed = Boolean(lesson.completedAt);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={cn(
                          "group grid w-full min-w-0 gap-4 border-b border-[#071a42]/20 p-4 text-left transition-colors last:border-b-0 hover:bg-white sm:grid-cols-[58px_150px_minmax(0,1fr)_auto] sm:items-center",
                          selected && "bg-[#fff0e5]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-12 w-12 items-center justify-center border-2 border-[#071a42] text-lg font-black",
                            completed
                              ? "bg-[#15803d] text-white"
                              : selected
                                ? "bg-[#f97316] text-white"
                                : "bg-[#f6cf62] text-[#071a42]",
                          )}
                        >
                          {completed ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            String(originalIndex + 1).padStart(2, "0")
                          )}
                        </span>

                        <div className="hidden sm:block">
                          {lesson.thumbnailDataUrl ? (
                            <div className="aspect-video overflow-hidden border-2 border-[#071a42] bg-[#071a42]">
                              <img
                                src={lesson.thumbnailDataUrl}
                                alt=""
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <TrainingPlaceholder trail={lesson.trail} />
                          )}
                        </div>

                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase tracking-[0.16em]",
                                completed ? "text-[#15803d]" : "text-[#f97316]",
                              )}
                            >
                              {completed ? "Concluída" : "Disponível"}
                            </span>
                            <span className="text-xs font-semibold text-[#071a42]/45">
                              {lesson.durationLabel}
                            </span>
                          </span>
                          <span className="mt-1 block truncate font-black">{lesson.title}</span>
                          <span className="mt-1 block line-clamp-1 text-xs text-[#071a42]/50">
                            {lesson.description}
                          </span>
                        </span>

                        <span
                          className={cn(
                            "hidden h-10 w-10 items-center justify-center border-2 border-[#071a42] sm:flex",
                            selected
                              ? "bg-[#1236c9] text-white"
                              : "bg-transparent text-[#071a42] group-hover:bg-[#071a42] group-hover:text-white",
                          )}
                        >
                          <Play className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                    {loading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
                    ) : (
                      <BookOpenCheck className="h-8 w-8 text-[#071a42]/35" />
                    )}
                    <h3 className="mt-4 font-black">
                      {loading
                        ? "Carregando aulas..."
                        : lessonSearch
                          ? "Nenhuma aula encontrada"
                          : "Trilha aguardando aulas"}
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-[#071a42]/50">
                      {lessonSearch
                        ? "Tente outro termo de busca."
                        : "As aulas publicadas pela liderança aparecerão nesta sequência."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>

      <EditLessonDialog
        activeUnitId={activeUnitId}
        lesson={selectedLesson}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
