import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  KanbanSquare,
  Loader2,
  Mail,
  Phone,
  Plus,
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
import type { CrmLeadTask } from "@/lib/crm-task-types";
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
  city: string;
  courseId: string;
  acquisitionChannelId: string;
  unitId: string;
  observations: string;
  stage: LeadStage;
};

type LeadTaskFormState = {
  title: string;
  dueAt: string;
  notes: string;
};

type LeadDialogMode = "create" | "edit";

type LeadsResponse = {
  leads: Array<LeadRecord>;
};

type CoursesResponse = {
  courses: Array<CourseRecord>;
};

type ChannelsResponse = {
  channels: Array<AcquisitionChannelRecord>;
};

type TasksResponse = {
  tasks: Array<CrmLeadTask>;
};

type TaskResponse = {
  task: CrmLeadTask;
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
];

const stageLabels: Record<LeadStage, string> = {
  "Novo lead": "Novo lead",
  "Em contato": "Em contato",
  Qualificado: "Qualificado",
  Proposta: "Proposta",
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

const confettiPalette = ["#F7D34D", "#E3AA2B", "#22C55E", "#15803D"];
const confettiPieces = Array.from({ length: 72 }, (_, index) => ({
  id: index,
  color: confettiPalette[index % confettiPalette.length],
  left: 6 + ((index * 19) % 88),
  delay: (index % 12) * 55,
  drift: ((index % 9) - 4) * 26,
  rise: 82 + ((index * 13) % 18),
  spin: 360 + ((index * 47) % 520),
  width: index % 3 === 0 ? 8 : 10,
  height: index % 4 === 0 ? 18 : 12,
}));

function emptyLeadForm(unitId = ""): LeadFormState {
  return {
    fullName: "",
    phone: "",
    email: "",
    city: "",
    courseId: "",
    acquisitionChannelId: "",
    unitId,
    observations: "",
    stage: "Novo lead",
  };
}

function emptyTaskForm(): LeadTaskFormState {
  return {
    title: "",
    dueAt: "",
    notes: "",
  };
}

function leadFormFromLead(lead: LeadRecord): LeadFormState {
  return {
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email ?? "",
    city: lead.city ?? "",
    courseId: lead.courseId ?? "",
    acquisitionChannelId: lead.acquisitionChannelId ?? "",
    unitId: lead.unitId,
    observations: lead.observations ?? "",
    stage: lead.stage,
  };
}

function localDateTimeToIso(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatTaskDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
  const [leadDialogMode, setLeadDialogMode] = React.useState<LeadDialogMode>("create");
  const [editingLead, setEditingLead] = React.useState<LeadRecord | null>(null);
  const [form, setForm] = React.useState<LeadFormState>(() => emptyLeadForm(activeUnitId));
  const [loadingLeads, setLoadingLeads] = React.useState(true);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [leadTasks, setLeadTasks] = React.useState<Array<CrmLeadTask>>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(false);
  const [taskForm, setTaskForm] = React.useState<LeadTaskFormState>(() => emptyTaskForm());
  const [savingTask, setSavingTask] = React.useState(false);
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);
  const [removingTaskId, setRemovingTaskId] = React.useState<string | null>(null);
  const [savingLead, setSavingLead] = React.useState(false);
  const [removingLeadId, setRemovingLeadId] = React.useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = React.useState<string | null>(null);
  const [confettiRunId, setConfettiRunId] = React.useState(0);
  const [draggingLeadId, setDraggingLeadId] = React.useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = React.useState<LeadStage | null>(null);
  const [syncingLeadId, setSyncingLeadId] = React.useState<string | null>(null);
  const formUnitId = form.unitId || activeUnitId;
  const selectedCourse = courses.find((course) => course.id === form.courseId) ?? null;
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  const loadLeads = React.useCallback(
    async (options?: { silent?: boolean }) => {
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
    },
    [activeUnitId],
  );

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

  const loadLeadTasks = React.useCallback(
    async (leadId: string, options?: { silent?: boolean }) => {
      if (!leadId) {
        setLeadTasks([]);
        return;
      }

      if (!options?.silent) {
        setLoadingTasks(true);
      }

      try {
        const data = await readJson<TasksResponse>(
          await fetch(`/api/crm/tasks?leadId=${encodeURIComponent(leadId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setLeadTasks(data.tasks);
      } catch (error) {
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar tarefas.");
        }
      } finally {
        if (!options?.silent) {
          setLoadingTasks(false);
        }
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  React.useEffect(() => {
    if (!activeUnitId) {
      return undefined;
    }

    const channel =
      "BroadcastChannel" in window ? new BroadcastChannel(`crm-pipeline-${activeUnitId}`) : null;
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

    setLeadDialogMode("create");
    setEditingLead(null);
    setForm(emptyLeadForm(unitId));
    setLeadTasks([]);
    setTaskForm(emptyTaskForm());
    setLeadDialogOpen(true);
  }

  function openEditLeadDialog(lead: LeadRecord) {
    setLeadDialogMode("edit");
    setEditingLead(lead);
    setForm(leadFormFromLead(lead));
    setTaskForm(emptyTaskForm());
    void loadLeadTasks(lead.id);
    setLeadDialogOpen(true);
  }

  async function handleSubmitLead(event: React.FormEvent<HTMLFormElement>) {
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
      if (leadDialogMode === "create") {
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
      } else if (editingLead) {
        await readJson<{ ok: true; stage: LeadStage }>(
          await fetch(`/api/crm/leads/${editingLead.id}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...payload, stage: form.stage }),
          }),
        );

        const course = courses.find((item) => item.id === (payload.courseId || ""));
        const channel = channels.find((item) => item.id === (payload.acquisitionChannelId || ""));

        setLeads((current) =>
          current.map((item) =>
            item.id === editingLead.id
              ? {
                  ...item,
                  fullName: payload.fullName,
                  phone: payload.phone,
                  email: payload.email || null,
                  city: payload.city || null,
                  courseId: payload.courseId || null,
                  courseName: course?.name ?? null,
                  courseValue: course?.value ?? null,
                  acquisitionChannelId: payload.acquisitionChannelId || null,
                  acquisitionChannelName: channel?.name ?? null,
                  observations: payload.observations || null,
                  stage: form.stage,
                }
              : item,
          ),
        );

        toast.success("Lead atualizado.");
        setLeadDialogOpen(false);
        setEditingLead(null);
        setForm(emptyLeadForm(activeUnitId));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar lead.");
    } finally {
      setSavingLead(false);
    }
  }

  async function handleCreateTask() {
    if (!editingLead) {
      return;
    }

    const dueAt = localDateTimeToIso(taskForm.dueAt);

    if (!taskForm.title.trim() || !dueAt) {
      toast.error("Preencha o título e o horário da tarefa.");
      return;
    }

    setSavingTask(true);

    try {
      const data = await readJson<TaskResponse>(
        await fetch("/api/crm/tasks", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId: editingLead.id,
            title: taskForm.title,
            dueAt,
            notes: taskForm.notes,
          }),
        }),
      );

      setLeadTasks((current) =>
        [data.task, ...current].sort(
          (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
        ),
      );
      setTaskForm(emptyTaskForm());
      toast.success("Tarefa agendada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar tarefa.");
    } finally {
      setSavingTask(false);
    }
  }

  async function updateTaskStatus(task: CrmLeadTask, status: "pending" | "done") {
    setUpdatingTaskId(task.id);

    try {
      const data = await readJson<TaskResponse>(
        await fetch("/api/crm/tasks", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: task.id, status }),
        }),
      );

      setLeadTasks((current) =>
        current.map((item) => (item.id === data.task.id ? data.task : item)),
      );
      toast.success(status === "done" ? "Tarefa concluída." : "Tarefa reaberta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar tarefa.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleRemoveTask(task: CrmLeadTask) {
    if (!window.confirm(`Remover a tarefa "${task.title}"?`)) {
      return;
    }

    setRemovingTaskId(task.id);

    try {
      await readJson<{ ok: true }>(
        await fetch("/api/crm/tasks", {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: task.id }),
        }),
      );

      setLeadTasks((current) => current.filter((item) => item.id !== task.id));
      toast.success("Tarefa removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover tarefa.");
    } finally {
      setRemovingTaskId(null);
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

  async function handleConvertLeadToStudent() {
    if (!editingLead) {
      return;
    }

    setConvertingLeadId(editingLead.id);
    setConfettiRunId((current) => current + 1);

    try {
      await readJson<{ ok: true; stage: LeadStage }>(
        await fetch(`/api/crm/leads/${editingLead.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage: "Matriculado" }),
        }),
      );

      setLeads((current) => current.filter((item) => item.id !== editingLead.id));
      broadcastChannelRef.current?.postMessage({
        type: "lead-stage-updated",
        leadId: editingLead.id,
        stage: "Matriculado",
      });

      toast.success("Taxa confirmada. Lead convertido em aluno.");
      setLeadDialogOpen(false);
      setEditingLead(null);
      setLeadDialogMode("create");
      setForm(emptyLeadForm(activeUnitId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao converter lead em aluno.");
    } finally {
      setConvertingLeadId(null);
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
      <ConversionConfetti runId={confettiRunId} />
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
                  onDragLeave={() =>
                    setDropTargetStage((current) => (current === stage ? null : current))
                  }
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
                        onEdit={() => openEditLeadDialog(lead)}
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
        mode={leadDialogMode}
        form={form}
        courses={courses}
        channels={channels}
        units={session?.units ?? []}
        selectedCourse={selectedCourse}
        loadingOptions={loadingOptions}
        tasks={leadTasks}
        taskForm={taskForm}
        loadingTasks={loadingTasks}
        savingTask={savingTask}
        updatingTaskId={updatingTaskId}
        removingTaskId={removingTaskId}
        saving={savingLead}
        converting={editingLead ? convertingLeadId === editingLead.id : false}
        onOpenChange={(open) => {
          setLeadDialogOpen(open);
          if (!open) {
            setEditingLead(null);
            setLeadDialogMode("create");
            setLeadTasks([]);
            setTaskForm(emptyTaskForm());
          }
        }}
        onFormChange={setForm}
        onTaskFormChange={setTaskForm}
        onSubmit={handleSubmitLead}
        onTaskSubmit={() => void handleCreateTask()}
        onTaskStatusChange={(task, status) => void updateTaskStatus(task, status)}
        onTaskRemove={(task) => void handleRemoveTask(task)}
        onConvertToStudent={() => void handleConvertLeadToStudent()}
        onResetNewLead={() => {
          setEditingLead(null);
          setLeadDialogMode("create");
          setForm(emptyLeadForm(activeUnitId));
        }}
      />
    </div>
  );
}

function ConversionConfetti({ runId }: { runId: number }) {
  if (!runId) {
    return null;
  }

  return (
    <div
      key={runId}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
    >
      {confettiPieces.map((piece) => (
        <span
          key={piece.id}
          className="conversion-confetti-piece"
          style={
            {
              "--confetti-drift": `${piece.drift}px`,
              "--confetti-rise": `-${piece.rise}vh`,
              "--confetti-spin": `${piece.spin}deg`,
              animationDelay: `${piece.delay}ms`,
              backgroundColor: piece.color,
              height: `${piece.height}px`,
              left: `${piece.left}%`,
              width: `${piece.width}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function LeadPipelineCard({
  lead,
  removing,
  dragging,
  syncing,
  onRemove,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadRecord;
  removing: boolean;
  dragging: boolean;
  syncing: boolean;
  onRemove: () => void;
  onEdit: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab border-primary/10 bg-white/90 p-3 shadow-card transition-all duration-200 ease-out active:cursor-grabbing ${
        dragging
          ? "scale-[0.98] opacity-60 shadow-lg"
          : "hover:-translate-y-0.5 hover:shadow-elegant"
      } ${syncing ? "ring-2 ring-primary/25" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onEdit}
            className="truncate text-left text-sm font-semibold transition hover:text-primary"
          >
            {lead.fullName}
          </button>
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
    </Card>
  );
}

function CreateLeadDialog({
  open,
  mode,
  form,
  courses,
  channels,
  units,
  selectedCourse,
  loadingOptions,
  tasks,
  taskForm,
  loadingTasks,
  savingTask,
  updatingTaskId,
  removingTaskId,
  saving,
  converting,
  onOpenChange,
  onFormChange,
  onTaskFormChange,
  onSubmit,
  onTaskSubmit,
  onTaskStatusChange,
  onTaskRemove,
  onConvertToStudent,
  onResetNewLead,
}: {
  open: boolean;
  mode: LeadDialogMode;
  form: LeadFormState;
  courses: Array<CourseRecord>;
  channels: Array<AcquisitionChannelRecord>;
  units: Array<{ id: string; name: string; slug: string }>;
  selectedCourse: CourseRecord | null;
  loadingOptions: boolean;
  tasks: Array<CrmLeadTask>;
  taskForm: LeadTaskFormState;
  loadingTasks: boolean;
  savingTask: boolean;
  updatingTaskId: string | null;
  removingTaskId: string | null;
  saving: boolean;
  converting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<LeadFormState>>;
  onTaskFormChange: React.Dispatch<React.SetStateAction<LeadTaskFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTaskSubmit: () => void;
  onTaskStatusChange: (task: CrmLeadTask, status: "pending" | "done") => void;
  onTaskRemove: (task: CrmLeadTask) => void;
  onConvertToStudent: () => void;
  onResetNewLead: () => void;
}) {
  const isEditMode = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/20 bg-card p-0 shadow-[0_28px_90px_-38px_rgba(11,42,111,0.85),0_0_34px_rgba(63,115,216,0.22)] sm:max-w-3xl">
        <form onSubmit={onSubmit}>
          <div className="relative overflow-hidden bg-gradient-hero p-6 text-primary-foreground">
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-gold ring-1 ring-white/20">
                  <UserPlus className="h-5 w-5" />
                </div>
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl text-white">
                    {isEditMode ? "Editar Lead" : "Criar Lead"}
                  </DialogTitle>
                  <DialogDescription className="text-white/70">
                    {isEditMode
                      ? "Atualize os dados comerciais e o estágio do lead."
                      : "Cadastro comercial vinculado ao curso e canal de aquisição."}
                  </DialogDescription>
                </DialogHeader>
              </div>
              {isEditMode ? (
                <Button
                  type="button"
                  onClick={onConvertToStudent}
                  disabled={saving || converting}
                  className="shrink-0 bg-emerald-500 font-bold uppercase tracking-wide text-white shadow-[0_16px_34px_-20px_rgba(16,185,129,0.95)] hover:bg-emerald-600 sm:ml-auto"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {converting ? "Convertendo..." : "TAXA FEITA"}
                </Button>
              ) : null}
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
              <Label htmlFor="lead-city">Cidade</Label>
              <Input
                id="lead-city"
                value={form.city}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, city: event.target.value }))
                }
                placeholder="Cidade do lead"
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

            {!isEditMode ? (
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
            ) : null}

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

            {isEditMode ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Status do lead</Label>
                <Select
                  value={form.stage}
                  onValueChange={(value) =>
                    onFormChange((current) => ({ ...current, stage: value as LeadStage }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {isEditMode ? (
              <div className="space-y-4 rounded-xl border border-primary/15 bg-[linear-gradient(135deg,rgba(11,42,111,.05),rgba(63,115,216,.09),rgba(227,170,43,.08))] p-4 md:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                      <CalendarClock className="h-4 w-4" />
                      Tarefas do lead
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Agende um próximo passo e o sistema avisa 15 minutos antes.
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                    {tasks.filter((task) => task.status === "pending").length} pendentes
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                  <div className="space-y-2">
                    <Label htmlFor="lead-task-title">Tarefa</Label>
                    <Input
                      id="lead-task-title"
                      value={taskForm.title}
                      onChange={(event) =>
                        onTaskFormChange((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Ex.: Ligar para confirmar documentação"
                      maxLength={140}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-task-due">Data e hora</Label>
                    <Input
                      id="lead-task-due"
                      type="datetime-local"
                      value={taskForm.dueAt}
                      onChange={(event) =>
                        onTaskFormChange((current) => ({
                          ...current,
                          dueAt: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lead-task-notes">Observação</Label>
                    <Textarea
                      id="lead-task-notes"
                      value={taskForm.notes}
                      onChange={(event) =>
                        onTaskFormChange((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Contexto da tarefa, combinado com o lead ou próximos passos."
                      className="min-h-20 bg-white/75"
                      maxLength={1200}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={onTaskSubmit}
                    disabled={savingTask || !taskForm.title || !taskForm.dueAt}
                    className="gap-2 bg-gradient-primary"
                  >
                    {savingTask ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarClock className="h-4 w-4" />
                    )}
                    {savingTask ? "Agendando..." : "Agendar tarefa"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {loadingTasks ? (
                    <div className="flex h-20 items-center justify-center rounded-lg border bg-white/60">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : tasks.length ? (
                    tasks.map((task) => {
                      const pending = task.status === "pending";
                      const busy = updatingTaskId === task.id || removingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="grid gap-3 rounded-lg border bg-white/80 p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  pending
                                    ? "border-gold/30 bg-gold/15 text-gold-foreground"
                                    : "border-success/25 bg-success/10 text-success"
                                }
                              >
                                {pending ? "Pendente" : "Concluída"}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                                <Clock3 className="h-3.5 w-3.5" />
                                {formatTaskDate(task.dueAt)}
                              </span>
                            </div>
                            <div className="mt-2 break-words text-sm font-bold">{task.title}</div>
                            {task.notes ? (
                              <p className="mt-1 whitespace-pre-line break-words text-xs text-muted-foreground">
                                {task.notes}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant={pending ? "default" : "outline"}
                              className={pending ? "gap-1.5 bg-gradient-primary" : "gap-1.5"}
                              onClick={() => onTaskStatusChange(task, pending ? "done" : "pending")}
                              disabled={busy}
                            >
                              {updatingTaskId === task.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {pending ? "Concluir" : "Reabrir"}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => onTaskRemove(task)}
                              disabled={busy}
                              aria-label={`Remover tarefa ${task.title}`}
                            >
                              {removingTaskId === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed bg-white/50 p-4 text-center text-sm text-muted-foreground">
                      Nenhuma tarefa agendada para este lead.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/70 bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onResetNewLead();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary"
              disabled={saving || converting || !form.unitId}
            >
              {saving
                ? isEditMode
                  ? "Salvando..."
                  : "Criando..."
                : isEditMode
                  ? "Salvar alterações"
                  : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
