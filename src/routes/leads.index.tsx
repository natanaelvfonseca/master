import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter, Lock, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { LeadRecord, StudentStage } from "@/lib/commercial-types";
import { useAuth } from "@/lib/auth";
import { canViewStudents } from "@/lib/auth-types";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeadsResponse = {
  leads: Array<LeadRecord>;
};

type StudentFilters = {
  courseId: string;
  channelId: string;
  city: string;
  unitId: string;
};

const FILTER_ALL = "__all__";
const studentStages: Array<StudentStage> = [
  "Matriculado",
  "Contrato Feito",
  "Aluno Confirmado",
  "Aluno Cancelado",
];

function emptyStudentFilters(): StudentFilters {
  return {
    courseId: FILTER_ALL,
    channelId: FILTER_ALL,
    city: FILTER_ALL,
    unitId: FILTER_ALL,
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
  return `?unitId=${encodeURIComponent(unitId)}&view=students`;
}

export const Route = createFileRoute("/leads/")({
  head: () => ({ meta: [{ title: "Alunos · Master" }] }),
  component: LeadsList,
});

function LeadsList() {
  const { session } = useAuth();
  const activeUnitId = session?.activeUnit?.id ?? "";
  const canViewStudentList = session ? canViewStudents(session.user.role) : false;  const [leads, setLeads] = React.useState<Array<LeadRecord>>([]);
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<StudentFilters>(() => emptyStudentFilters());
  const [loading, setLoading] = React.useState(true);
  const [removingLeadId, setRemovingLeadId] = React.useState<string | null>(null);
  const [syncingLeadId, setSyncingLeadId] = React.useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadLeads() {
      if (session && !canViewStudentList) {
        setLeads([]);
        setLoading(false);
        return;
      }

      if (!activeUnitId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const data = await readJson<LeadsResponse>(
          await fetch(`/api/crm/leads${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        setLeads(data.leads);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar alunos.");
      } finally {
        setLoading(false);
      }
    }

    void loadLeads();
  }, [activeUnitId, canViewStudentList, session]);

  if (session && !canViewStudentList) {
    return <StudentsAccessDenied />;
  }

  const courseOptions = Array.from(
    new Map(
      leads
        .filter((lead) => lead.courseId && lead.courseName)
        .map((lead) => [lead.courseId as string, lead.courseName as string]),
    ),
    ([id, name]) => ({ id, name }),
  ).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  const channelOptions = Array.from(
    new Map(
      leads
        .filter((lead) => lead.acquisitionChannelId && lead.acquisitionChannelName)
        .map((lead) => [
          lead.acquisitionChannelId as string,
          lead.acquisitionChannelName as string,
        ]),
    ),
    ([id, name]) => ({ id, name }),
  ).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  const cityOptions = Array.from(
    new Set(leads.map((lead) => lead.city).filter(Boolean) as Array<string>),
  ).sort((first, second) => first.localeCompare(second, "pt-BR"));
  const unitOptions = Array.from(
    new Map(leads.map((lead) => [lead.unitId, lead.unitName])),
    ([id, name]) => ({ id, name }),
  ).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  const activeFilterCount = [
    filters.courseId,
    filters.channelId,
    filters.city,
    filters.unitId,
  ].filter((value) => value !== FILTER_ALL).length;

  const filteredLeads = leads.filter((lead) => {
    const searchText = [
      lead.fullName,
      lead.phone,
      lead.phone2,
      lead.email,
      lead.city,
      lead.courseName,
      lead.acquisitionChannelName,
      lead.unitName,
      lead.stage,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      searchText.includes(search.trim().toLowerCase()) &&
      (filters.courseId === FILTER_ALL || lead.courseId === filters.courseId) &&
      (filters.channelId === FILTER_ALL || lead.acquisitionChannelId === filters.channelId) &&
      (filters.city === FILTER_ALL || lead.city === filters.city) &&
      (filters.unitId === FILTER_ALL || lead.unitId === filters.unitId)
    );
  });

  function clearStudentFilters() {
    setSearch("");
    setFilters(emptyStudentFilters());
  }

  async function handleRemoveStudent(lead: LeadRecord) {
    if (!window.confirm(`Remover o cliente "${lead.fullName}" do banco de dados?`)) {
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
      toast.success("Cliente removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover cliente.");
    } finally {
      setRemovingLeadId(null);
    }
  }

  async function updateStudentStage(lead: LeadRecord, studentStage: StudentStage) {
    if (lead.studentStage === studentStage) return;

    setSyncingLeadId(lead.id);
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, studentStage } : item)),
    );
    try {
      await readJson<{ ok: true; studentStage: StudentStage }>(
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ studentStage }),
        }),
      );
      toast.success(`Aluno movido para ${studentStage}.`);
    } catch (error) {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id ? { ...item, studentStage: lead.studentStage } : item,
        ),
      );
      toast.error(error instanceof Error ? error.message : "Falha ao mover aluno.");
    } finally {
      setSyncingLeadId(null);
      setDraggingLeadId(null);
    }
  }

  return (
    <div>      <PageHeader
        eyebrow="Comercial"
        title="Alunos"
        description="Base de alunos convertidos quando a taxa foi confirmada no CRM Pipeline."
      />
      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por aluno, telefone, curso, cidade ou origem..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={filtersOpen ? "default" : "outline"}
                onClick={() => setFiltersOpen((open) => !open)}
                className={filtersOpen ? "bg-gradient-primary" : ""}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {activeFilterCount ? (
                  <Badge className="ml-2 bg-gold text-gold-foreground">{activeFilterCount}</Badge>
                ) : null}
              </Button>
              {search || activeFilterCount ? (
                <Button type="button" variant="ghost" onClick={clearStudentFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select
                  value={filters.courseId}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, courseId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cursos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Todos os cursos</SelectItem>
                    {courseOptions.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={filters.channelId}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, channelId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Todas as origens</SelectItem>
                    {channelOptions.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select
                  value={filters.city}
                  onValueChange={(value) => setFilters((current) => ({ ...current, city: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Todas as cidades</SelectItem>
                    {cityOptions.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={filters.unitId}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, unitId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Todas as unidades</SelectItem>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto p-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando alunos...</div>
          ) : filteredLeads.length ? (
            <div className="flex min-w-max gap-4">
              {studentStages.map((studentStage) => {
                const stageStudents = filteredLeads.filter(
                  (lead) => lead.studentStage === studentStage,
                );
                return (
                  <section key={studentStage} className="w-[290px] shrink-0">
                    <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-primary">
                          {studentStage}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stageStudents.length} {stageStudents.length === 1 ? "aluno" : "alunos"}
                        </div>
                      </div>
                    </div>
                    <div
                      className="min-h-40 space-y-3 rounded-xl border bg-muted/20 p-3"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const lead = leads.find(
                          (item) => item.id === event.dataTransfer.getData("text/plain"),
                        );
                        if (lead) void updateStudentStage(lead, studentStage);
                      }}
                    >
                      {stageStudents.map((lead) => (
                        <Card
                          key={lead.id}
                          draggable={syncingLeadId !== lead.id}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", lead.id);
                            setDraggingLeadId(lead.id);
                          }}
                          onDragEnd={() => setDraggingLeadId(null)}
                          className={`cursor-grab p-4 shadow-card transition-opacity ${
                            draggingLeadId === lead.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{lead.fullName}</div>
                              <div className="text-xs text-muted-foreground">{lead.phone}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleRemoveStudent(lead)}
                              disabled={removingLeadId === lead.id || syncingLeadId === lead.id}
                              aria-label={`Remover ${lead.fullName}`}
                              title="Remover aluno"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <div>{lead.courseName ?? "Curso não informado"}</div>
                            <div>{lead.city ?? "Cidade não informada"}</div>
                            <div>{lead.unitName}</div>
                          </div>
                          <Select
                            value={lead.studentStage}
                            onValueChange={(value) =>
                              void updateStudentStage(lead, value as StudentStage)
                            }
                            disabled={syncingLeadId === lead.id}
                          >
                            <SelectTrigger className="mt-3 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {studentStages.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Nenhum aluno convertido"
              description="A lista será preenchida quando a taxa for confirmada no modal do lead."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function StudentsAccessDenied() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A lista de alunos fica disponível para liderança e administração.
        </p>
      </div>
    </div>
  );
}
