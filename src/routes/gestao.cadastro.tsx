import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Edit3,
  GraduationCap,
  Plus,
  RadioTower,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "active" | "inactive";

type Course = {
  id: string;
  name: string;
  value: number;
  category?: string;
  status: Status;
};

type AcquisitionChannel = {
  id: string;
  name: string;
  type: string;
  status: Status;
};

type CourseFormState = {
  name: string;
  value: string;
  category: string;
  status: Status;
};

type ChannelFormState = {
  name: string;
  type: string;
  status: Status;
};

type DeleteTarget =
  | { kind: "course"; id: string; name: string }
  | { kind: "channel"; id: string; name: string };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const initialCourseForm: CourseFormState = {
  name: "",
  value: "",
  category: "",
  status: "active",
};

const initialChannelForm: ChannelFormState = {
  name: "",
  type: "Pago",
  status: "active",
};

const initialChannels: Array<AcquisitionChannel> = [
  { id: "meta-ads", name: "Meta Ads", type: "Pago", status: "active" },
  { id: "google-ads", name: "Google Ads", type: "Pago", status: "active" },
  { id: "tiktok", name: "TikTok", type: "Pago", status: "active" },
  { id: "instagram-organico", name: "Instagram Orgânico", type: "Orgânico", status: "active" },
  { id: "whatsapp", name: "WhatsApp", type: "Conversacional", status: "active" },
  { id: "indicacao", name: "Indicação", type: "Relacionamento", status: "active" },
  { id: "site", name: "Site", type: "Próprio", status: "active" },
  { id: "evento", name: "Evento", type: "Presencial", status: "inactive" },
  { id: "parceria", name: "Parceria", type: "Relacionamento", status: "active" },
];

export const Route = createFileRoute("/gestao/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro - Gestão - Plenarius Growth Hub" }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const [courses, setCourses] = React.useState<Array<Course>>([]);
  const [channels, setChannels] = React.useState<Array<AcquisitionChannel>>(initialChannels);
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = React.useState(false);
  const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = React.useState<string | null>(null);
  const [courseForm, setCourseForm] = React.useState<CourseFormState>(initialCourseForm);
  const [channelForm, setChannelForm] = React.useState<ChannelFormState>(initialChannelForm);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);

  const activeCourses = courses.filter((course) => course.status === "active").length;
  const activeChannels = channels.filter((channel) => channel.status === "active").length;

  function openNewCourseDialog() {
    setEditingCourseId(null);
    setCourseForm(initialCourseForm);
    setCourseDialogOpen(true);
  }

  function openEditCourseDialog(course: Course) {
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name,
      value: String(course.value),
      category: course.category ?? "",
      status: course.status,
    });
    setCourseDialogOpen(true);
  }

  function openNewChannelDialog() {
    setEditingChannelId(null);
    setChannelForm(initialChannelForm);
    setChannelDialogOpen(true);
  }

  function openEditChannelDialog(channel: AcquisitionChannel) {
    setEditingChannelId(channel.id);
    setChannelForm({
      name: channel.name,
      type: channel.type,
      status: channel.status,
    });
    setChannelDialogOpen(true);
  }

  function handleCourseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedValue = Number(courseForm.value.replace(",", "."));
    if (!courseForm.name.trim() || Number.isNaN(parsedValue) || parsedValue < 0) {
      toast.error("Preencha o nome e um valor válido para o curso.");
      return;
    }

    if (editingCourseId) {
      setCourses((current) =>
        current.map((course) =>
          course.id === editingCourseId
            ? {
                ...course,
                name: courseForm.name.trim(),
                value: parsedValue,
                category: courseForm.category.trim() || undefined,
                status: courseForm.status,
              }
            : course,
        ),
      );
      toast.success("Curso atualizado.");
    } else {
      setCourses((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: courseForm.name.trim(),
          value: parsedValue,
          category: courseForm.category.trim() || undefined,
          status: courseForm.status,
        },
      ]);
      toast.success("Curso cadastrado.");
    }

    setCourseDialogOpen(false);
  }

  function handleChannelSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!channelForm.name.trim() || !channelForm.type.trim()) {
      toast.error("Preencha o canal e o tipo.");
      return;
    }

    if (editingChannelId) {
      setChannels((current) =>
        current.map((channel) =>
          channel.id === editingChannelId
            ? {
                ...channel,
                name: channelForm.name.trim(),
                type: channelForm.type.trim(),
                status: channelForm.status,
              }
            : channel,
        ),
      );
      toast.success("Canal atualizado.");
    } else {
      setChannels((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: channelForm.name.trim(),
          type: channelForm.type.trim(),
          status: channelForm.status,
        },
      ]);
      toast.success("Canal cadastrado.");
    }

    setChannelDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.kind === "course") {
      setCourses((current) => current.filter((course) => course.id !== deleteTarget.id));
      toast.success("Curso excluído.");
    } else {
      setChannels((current) => current.filter((channel) => channel.id !== deleteTarget.id));
      toast.success("Canal excluído.");
    }

    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Cadastro"
        description="Central operacional para manter cursos e canais de aquisição prontos para as integrações comerciais."
        actions={
          <>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {activeCourses} cursos ativos
            </Badge>
            <Badge variant="secondary" className="bg-gold/15 text-gold-foreground">
              {activeChannels} canais ativos
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={GraduationCap}
          label="Cursos cadastrados"
          value={courses.length}
          detail="Base pronta para precificação e matrículas."
        />
        <MetricCard
          icon={RadioTower}
          label="Canais de aquisição"
          value={channels.length}
          detail="Origem padronizada para leads e campanhas."
        />
        <MetricCard
          icon={Sparkles}
          label="Status operacional"
          value="Live"
          detail="Fluxos locais ativos, aguardando APIs finais."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="animate-panel-rise overflow-hidden border-primary/10 shadow-card">
          <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-card to-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-[0_12px_28px_-18px_rgba(23,70,184,0.95)]">
                  <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Cursos</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Crie, edite e organize a esteira de produtos educacionais.
                  </p>
                </div>
              </div>
              <Button onClick={openNewCourseDialog} className="bg-gradient-primary shadow-elegant">
                <Plus className="h-4 w-4" />
                Novo Curso
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-5">Nome</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[128px] text-right pr-5">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length ? (
                  courses.map((course) => (
                    <TableRow key={course.id} className="group">
                      <TableCell className="px-5 font-medium">
                        <div>{course.name}</div>
                        {course.category ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {course.category}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {currencyFormatter.format(course.value)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={course.status} />
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCourseDialog(course)}
                            aria-label={`Editar ${course.name}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({ kind: "course", id: course.id, name: course.name })
                            }
                            aria-label={`Excluir ${course.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 px-5 text-center text-muted-foreground">
                      Nenhum curso cadastrado ainda. Use o botão Novo Curso para iniciar a base.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="animate-panel-rise overflow-hidden border-primary/10 shadow-card [animation-delay:80ms]">
          <CardHeader className="border-b border-border/70 bg-gradient-to-r from-gold/15 via-card to-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold text-gold-foreground shadow-[0_12px_28px_-18px_rgba(227,170,43,0.95)]">
                  <RadioTower className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Canais de Aquisição</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fontes padronizadas para classificação de leads e campanhas.
                  </p>
                </div>
              </div>
              <Button
                onClick={openNewChannelDialog}
                variant="outline"
                className="border-primary/30 bg-white/70 text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                Novo Canal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-5">Canal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[128px] text-right pr-5">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="px-5 font-medium">{channel.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-secondary/80 text-secondary-foreground"
                      >
                        {channel.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={channel.status} />
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditChannelDialog(channel)}
                          aria-label={`Editar ${channel.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ kind: "channel", id: channel.id, name: channel.name })
                          }
                          aria-label={`Excluir ${channel.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CourseDialog
        open={courseDialogOpen}
        editing={Boolean(editingCourseId)}
        form={courseForm}
        onOpenChange={setCourseDialogOpen}
        onFormChange={setCourseForm}
        onSubmit={handleCourseSubmit}
      />
      <ChannelDialog
        open={channelDialogOpen}
        editing={Boolean(editingChannelId)}
        form={channelForm}
        onOpenChange={setChannelDialogOpen}
        onFormChange={setChannelForm}
        onSubmit={handleChannelSubmit}
      />
      <DeleteDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <Card className="animate-panel-rise border-primary/10 bg-card/90 shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[0_0_24px_rgba(63,115,216,0.16)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none text-foreground">{value}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const isActive = status === "active";

  return (
    <Badge
      variant="secondary"
      className={isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}
    >
      {isActive ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function CourseDialog({
  open,
  editing,
  form,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  editing: boolean;
  form: CourseFormState;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<CourseFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-card shadow-elegant sm:max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle>
            <DialogDescription>
              Defina o curso, valor comercial e status exibidos na base de cadastro.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="course-name">Nome do curso</Label>
              <Input
                id="course-name"
                value={form.name}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex.: Informatica Profissional"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-value">Valor do curso</Label>
              <Input
                id="course-value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, value: event.target.value }))
                }
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-category">Categoria (opcional)</Label>
              <Input
                id="course-category"
                value={form.category}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Ex.: Tecnologia"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  onFormChange((current) => ({ ...current, status: value as Status }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {editing ? "Salvar alterações" : "Criar curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChannelDialog({
  open,
  editing,
  form,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  editing: boolean;
  form: ChannelFormState;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<ChannelFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-card shadow-elegant sm:max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar canal" : "Novo canal"}</DialogTitle>
            <DialogDescription>
              Organize as fontes de aquisição que alimentarão leads, campanhas e relatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Canal</Label>
              <Input
                id="channel-name"
                value={form.name}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex.: LinkedIn Ads"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-type">Tipo</Label>
              <Input
                id="channel-type"
                value={form.type}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, type: event.target.value }))
                }
                placeholder="Ex.: Pago"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  onFormChange((current) => ({ ...current, status: value as Status }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {editing ? "Salvar alterações" : "Criar canal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="border-destructive/25 bg-card shadow-elegant sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            {target
              ? `Deseja excluir "${target.name}"? Esta ação remove o registro da tela atual.`
              : "Deseja excluir este registro?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
