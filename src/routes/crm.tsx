import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Building2,
  Filter,
  KanbanSquare,
  Mail,
  Phone,
  Plus,
  RadioTower,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AcquisitionChannelRecord,
  CourseRecord,
  LeadRecord,
  LeadStage,
} from "@/lib/commercial-types";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

type LeadFormState = {
  fullName: string;
  phone: string;
  email: string;
  courseId: string;
  acquisitionChannelId: string;
  unitId: string;
  observations: string;
};

type LeadsResponse = {
  leads: Array<LeadRecord>;
};

type CoursesResponse = {
  courses: Array<CourseRecord>;
};

type ChannelsResponse = {
  channels: Array<AcquisitionChannelRecord>;
};

const NO_SELECTION = "__none__";

const stages: Array<LeadStage> = [
  "Novo lead",
  "Em contato",
  "Qualificado",
  "Proposta",
  "Pagamento pendente",
  "Confirmado",
  "Recuperação",
  "Matriculado",
];

const stageLabels: Record<LeadStage, string> = {
  "Novo lead": "Novo lead",
  "Em contato": "Em contato",
  "Qualificado": "Qualificado",
  "Proposta": "Proposta",
  "Pagamento pendente": "Pagamento pendente",
  Confirmado: "Confirmado",
  Recuperação: "Recuperação",
  Matriculado: "Matriculado",
};

const pollingIntervalMs = 20000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function emptyLeadForm(unitId = ""): LeadFormState {
  return {
    fullName: "",
    phone: "",
    email: "",
    courseId: "",
    acquisitionChannelId: "",
    unitId,
    observations: "",
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha na requisição.");
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}`;
}

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM Pipeline · Planarius Growth Hub" }] }),
  component: CRM,
});

function CRM() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const [leads, setLeads] = React.useState<Array<LeadRecord>>([]);
  const [courses, setCourses] = React.useState<Array<CourseRecord>>([]);
  const [channels, setChannels] = React.useState<Array<AcquisitionChannelRecord>>([]);
  const [leadDialogOpen, setLeadDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<LeadFormState>(() => emptyLeadForm(activeUnitId));
  const [loadingLeads, setLoadingLeads] = React.useState(true);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [savingLead, setSavingLead] = React.useState(false);
  const [removingLeadId, setRemovingLeadId] = React.useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = React.useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = React.useState<LeadStage | null>(null);
  const [syncingLeadId, setSyncingLeadId] = React.useState<string | null>(null);
  const formUnitId = form.unitId || activeUnitId;
  const selectedCourse = courses.find((course) => course.id === form.courseId) ?? null;
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  const loadLeads = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!activeUnitId) {
      setLoadingLeads(false);
      return;
    }

    if (!options?.silent) {
      setLoadingLeads(true);
    }

    try {
      const data = await readJson<LeadsResponse>(
        await fetch(`/api/crm/leads${unitQuery(activeUnitId)}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        }),
      );

      setLeads(data.leads);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar leads.");
    } finally {
      if (!options?.silent) {
        setLoadingLeads(false);
      }
    }
  }, [activeUnitId]);

  const loadOptions = React.useCallback(async (unitId: string) => {
    if (!unitId) {
      setCourses([]);
      setChannels([]);
      return;
    }

    setLoadingOptions(true);

    try {
      const [coursesData, channelsData] = await Promise.all([
        readJson<CoursesResponse>(
          await fetch(`/api/gestao/courses${unitQuery(unitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        ),
        readJson<ChannelsResponse>(
          await fetch(`/api/gestao/channels${unitQuery(unitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        ),
      ]);

      setCourses(coursesData.courses.filter((course) => course.status === "active"));
      setChannels(channelsData.channels.filter((channel) => channel.status === "active"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar opções do lead.");
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  React.useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  React.useEffect(() => {
    if (!activeUnitId) {
      return undefined;
    }

    const channel = "BroadcastChannel" in window ? new BroadcastChannel(`crm-pipeline-${activeUnitId}`) : null;
    broadcastChannelRef.current = channel;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadLeads({ silent: true });
      }
    };

    const handleFocus = () => {
      void loadLeads({ silent: true });
    };

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === "lead-stage-updated") {
          void loadLeads({ silent: true });
        }
      };
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadLeads({ silent: true });
      }
    }, pollingIntervalMs);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      channel?.close();
      if (broadcastChannelRef.current === channel) {
        broadcastChannelRef.current = null;
      }
    };
  }, [activeUnitId, loadLeads]);

  React.useEffect(() => {
    if (activeUnitId) {
      setForm((current) => ({ ...current, unitId: current.unitId || activeUnitId }));
    }
  }, [activeUnitId]);

  React.useEffect(() => {
    void loadOptions(formUnitId);
  }, [formUnitId, loadOptions]);

  function openLeadDialog() {
    const unitId = activeUnitId || session?.units[0]?.id || "";

    setForm(emptyLeadForm(unitId));
    setLeadDialogOpen(true);
  }

  async function handleCreateLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.phone.trim()) {
      toast.error("Nome completo e telefone são obrigatórios.");
      return;
    }

    setSavingLead(true);

    try {
      const payload = {
        ...form,
        courseId: form.courseId === NO_SELECTION ? "" : form.courseId,
        acquisitionChannelId:
          form.acquisitionChannelId === NO_SELECTION ? "" : form.acquisitionChannelId,
      };
      const data = await readJson<{ lead: LeadRecord }>(
        await fetch("/api/crm/leads", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      toast.success("Lead criado.");
      setLeadDialogOpen(false);
      setForm(emptyLeadForm(activeUnitId));

      if (data.lead.unitId === activeUnitId) {
        setLeads((current) => [data.lead, ...current]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar lead.");
    } finally {
      setSavingLead(false);
    }
  }

  async function handleRemoveLead(lead: LeadRecord) {
    if (!window.confirm(`Remover o lead "${lead.fullName}" do banco de dados?`)) {
      return;
    }

    setRemovingLeadId(lead.id);

    try {
      await readJson<{ ok: true }>(
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        }),
      );

      setLeads((current) => current.filter((item) => item.id !== lead.id));
      toast.success("Lead removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover lead.");
    } finally {
      setRemovingLeadId(null);
    }
  }

  async function updateLeadStage(lead: LeadRecord, nextStage: LeadStage) {
    if (lead.stage === nextStage) {
      return;
    }

    setSyncingLeadId(lead.id);
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, stage: nextStage } : item)),
    );

    try {
      await readJson<{ ok: true; stage: LeadStage }>(
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage: nextStage }),
        }),
      );

      broadcastChannelRef.current?.postMessage({
        type: "lead-stage-updated",
        leadId: lead.id,
        stage: nextStage,
      });

      void loadLeads({ silent: true });

      toast.success(`Lead movido para ${stageLabels[nextStage]}.`);
    } catch (error) {
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? { ...item, stage: lead.stage } : item)),
      );
      toast.error(error instanceof Error ? error.message : "Falha ao mover lead.");
    } finally {
      setSyncingLeadId(null);
      setDraggingLeadId(null);
      setDropTargetStage(null);
    }
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>, lead: LeadRecord) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lead.id);
    setDraggingLeadId(lead.id);
  }

  function handleDragEnd() {
    setDraggingLeadId(null);
    setDropTargetStage(null);
  }

  function handleStageDrop(event: React.DragEvent<HTMLDivElement>, stage: LeadStage) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain");
    const lead = leads.find((item) => item.id === leadId);

    setDropTargetStage(null);

    if (!lead) {
      setDraggingLeadId(null);
      return;
    }

    void updateLeadStage(lead, stage);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="CRM Pipeline"
        description="Pipeline visual com lead score por IA, alertas de follow-up e priorização inteligente."
        actions={
          <>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={openLeadDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          </>
        }
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {stages.map((stage) => {
            const stageLeads = leads.filter((lead) => lead.stage === stage);
            const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.courseValue ?? 0), 0);
            const isDropTarget = dropTargetStage === stage;

            return (
              <div key={stage} className="w-[280px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 shadow-card">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {stage}
                    </div>
                    <div className="text-sm font-semibold">
                      {loadingLeads ? "..." : `${stageLeads.length} leads`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Pipeline</div>
                    <div className="text-xs font-semibold text-primary">
                      {currencyFormatter.format(stageValue)}
                    </div>
                  </div>
                </div>
                <div
                  className={`space-y-3 rounded-xl border bg-card/60 p-3 shadow-card transition-colors duration-200 ${
                    isDropTarget ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTargetStage(stage);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDropTargetStage(stage);
                  }}
                  onDragLeave={() => setDropTargetStage((current) => (current === stage ? null : current))}
                  onDrop={(event) => handleStageDrop(event, stage)}
                >
                  {loadingLeads ? (
                    <EmptyState
                      icon={KanbanSquare}
                      title="Carregando"
                      description="Sincronizando leads da unidade ativa."
                    />
                  ) : stageLeads.length ? (
                    stageLeads.map((lead) => (
                      <LeadPipelineCard
                        key={lead.id}
                        lead={lead}
                        removing={removingLeadId === lead.id}
                        dragging={draggingLeadId === lead.id}
                        syncing={syncingLeadId === lead.id}
                        onRemove={() => void handleRemoveLead(lead)}
                        onDragStart={(event) => handleDragStart(event, lead)}
                        onDragEnd={handleDragEnd}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={KanbanSquare}
                      title="Sem leads"
                      description="Quando houver registros reais, eles aparecerão neste estágio."
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateLeadDialog
        open={leadDialogOpen}
        form={form}
        courses={courses}
        channels={channels}
        units={session?.units ?? []}
        selectedCourse={selectedCourse}
        loadingOptions={loadingOptions}
        saving={savingLead}
        onOpenChange={setLeadDialogOpen}
        onFormChange={setForm}
        onSubmit={handleCreateLead}
      />
    </div>
  );
}

function LeadPipelineCard({
  lead,
  removing,
  dragging,
  syncing,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadRecord;
  removing: boolean;
  dragging: boolean;
  syncing: boolean;
  onRemove: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab border-primary/10 bg-white/90 p-3 shadow-card transition-all duration-200 ease-out active:cursor-grabbing ${
        dragging ? "scale-[0.98] opacity-60 shadow-lg" : "hover:-translate-y-0.5 hover:shadow-elegant"
      } ${syncing ? "ring-2 ring-primary/25" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{lead.fullName}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span className="truncate">{lead.phone}</span>
          </div>
          {lead.email ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{lead.email}</span>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive opacity-70 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remover ${lead.fullName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {lead.courseName ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {lead.courseName}
          </Badge>
        ) : null}
        {lead.acquisitionChannelName ? (
          <Badge variant="secondary" className="bg-gold/15 text-gold-foreground">
            {lead.acquisitionChannelName}
          </Badge>
        ) : null}
      </div>
      {lead.courseValue !== null ? (
        <div className="mt-3 text-xs font-semibold text-primary">
          {currencyFormatter.format(lead.courseValue)}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>Arraste para mover</span>
        <span>{lead.stage}</span>
      </div>
    </Card>
  );
}

function CreateLeadDialog({
  open,
  form,
  courses,
  channels,
  units,
  selectedCourse,
  loadingOptions,
  saving,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  form: LeadFormState;
  courses: Array<CourseRecord>;
  channels: Array<AcquisitionChannelRecord>;
  units: Array<{ id: string; name: string; slug: string }>;
  selectedCourse: CourseRecord | null;
  loadingOptions: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<LeadFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/20 bg-card p-0 shadow-[0_28px_90px_-38px_rgba(11,42,111,0.85),0_0_34px_rgba(63,115,216,0.22)] sm:max-w-3xl">
        <form onSubmit={onSubmit}>
          <div className="relative overflow-hidden bg-gradient-hero p-6 text-primary-foreground">
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-gold ring-1 ring-white/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-xl text-white">Criar Lead</DialogTitle>
                <DialogDescription className="text-white/70">
                  Cadastro comercial vinculado à unidade, curso e canal de aquisição.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-full-name">Nome Completo</Label>
              <Input
                id="lead-full-name"
                value={form.fullName}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Nome do lead"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-phone">Telefone</Label>
              <Input
                id="lead-phone"
                value={form.phone}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-email">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="lead@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Curso de Interesse</Label>
              <Select
                value={form.courseId || NO_SELECTION}
                onValueChange={(value) =>
                  onFormChange((current) => ({
                    ...current,
                    courseId: value === NO_SELECTION ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>Sem curso definido</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCourse ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  Valor conhecido: {currencyFormatter.format(selectedCourse.value)}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Canal de Aquisição</Label>
              <Select
                value={form.acquisitionChannelId || NO_SELECTION}
                onValueChange={(value) =>
                  onFormChange((current) => ({
                    ...current,
                    acquisitionChannelId: value === NO_SELECTION ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>Sem canal definido</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Unidade</Label>
              <Select
                value={form.unitId}
                onValueChange={(value) =>
                  onFormChange((current) => ({
                    ...current,
                    unitId: value,
                    courseId: "",
                    acquisitionChannelId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lead-observations">Observações</Label>
              <Textarea
                id="lead-observations"
                value={form.observations}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, observations: event.target.value }))
                }
                placeholder="Anotações comerciais, intenção, disponibilidade ou próximos passos."
                className="min-h-24"
              />
            </div>

            <div className="grid gap-3 rounded-xl border border-primary/10 bg-secondary/30 p-4 md:col-span-2 md:grid-cols-3">
              <LeadContextItem icon={Building2} label="Unidade" value="Sincronizada" />
              <LeadContextItem icon={RadioTower} label="Origem" value="Rastreável" />
              <LeadContextItem icon={Sparkles} label="Relatórios" value="Valor preservado" />
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary" disabled={saving || !form.unitId}>
              {saving ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeadContextItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="text-xs font-semibold">{value}</div>
      </div>
    </div>
  );
}
