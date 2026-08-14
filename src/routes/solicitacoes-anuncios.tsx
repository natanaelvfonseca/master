import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { canViewAdRequests } from "@/lib/auth-types";
import {
  AD_REQUEST_STATUSES,
  adRequestStatusLabels,
  type AdRequest,
  type AdRequestStatus,
} from "@/lib/ad-request-types";
import { cn } from "@/lib/utils";

type ApiResponse = {
  requests: Array<AdRequest>;
  courses: Array<{ id: string; name: string }>;
  consultants: Array<{ id: string; name: string }>;
  cities: Array<string>;
  canCreate: boolean;
  canManage: boolean;
};

type FormState = {
  courseId: string;
  city: string;
  consultantIds: Array<string>;
  classDate: string;
  observation: string;
};

const emptyForm: FormState = { courseId: "", city: "", consultantIds: [], classDate: "", observation: "" };

const statusTone: Record<AdRequestStatus, string> = {
  novo: "border-orange-200 bg-orange-50 text-orange-700",
  em_producao: "border-blue-200 bg-blue-50 text-blue-700",
  aguardando_aprovacao: "border-amber-200 bg-amber-50 text-amber-700",
  concluido: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelado: "border-slate-200 bg-slate-100 text-slate-600",
};

async function readJson<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
  return data;
}

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(withTime ? value : `${value}T12:00:00`));
}

function SlaClock({ request, now }: { request: AdRequest; now: number }) {
  if (request.status === "concluido") {
    return <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Concluída no fluxo</span>;
  }
  if (request.status === "cancelado") return <span className="text-muted-foreground">Prazo encerrado</span>;

  const remaining = new Date(request.dueAt).getTime() - now;
  const overdue = remaining < 0;
  const totalMinutes = Math.floor(Math.abs(remaining) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return (
    <span className={cn("flex items-center gap-1.5 font-bold tabular-nums", overdue ? "text-destructive" : hours < 4 ? "text-amber-700" : "text-primary")}>
      {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {overdue ? "Atrasada há " : "Restam "}{hours}h {String(minutes).padStart(2, "0")}min
    </span>
  );
}

export const Route = createFileRoute("/solicitacoes-anuncios")({
  head: () => ({ meta: [{ title: "Solicitações de anúncios · Master CRM" }] }),
  component: AdRequestsPage,
});

function AdRequestsPage() {
  const { session } = useAuth();
  const canAccess = session ? canViewAdRequests(session.user.role) : false;
  const activeUnitId = session?.activeUnit?.id ?? "";
  const [data, setData] = React.useState<ApiResponse>({ requests: [], courses: [], consultants: [], cities: [], canCreate: false, canManage: false });
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("ativas");
  const [unitFilter, setUnitFilter] = React.useState("todas");
  const [drafts, setDrafts] = React.useState<Record<string, { status: AdRequestStatus; masterNote: string }>>({});
  const [now, setNow] = React.useState(Date.now());
  const [attendanceRequest, setAttendanceRequest] = React.useState<AdRequest | null>(null);
  const [attendanceState, setAttendanceState] = React.useState("");
  const [creatingAttendance, setCreatingAttendance] = React.useState(false);

  const load = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!canAccess) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const response = await readJson<ApiResponse>(await fetch("/api/ad-requests", { credentials: "same-origin", headers: { Accept: "application/json" } }));
      setData(response);
      setDrafts((current) => Object.fromEntries(response.requests.map((item) => [item.id, current[item.id] ?? { status: item.status, masterNote: item.masterNote }])));
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : "Falha ao carregar solicitações.");
    } finally { if (!silent) setLoading(false); }
  }, [canAccess]);

  React.useEffect(() => { void load(); }, [load, activeUnitId]);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.courseId || !form.city.trim() || !form.consultantIds.length || !form.classDate) {
      toast.error("Preencha curso, cidade, ao menos um consultor e data da turma.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await readJson<{ request: AdRequest }>(await fetch("/api/ad-requests", {
        method: "POST", credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, unitId: activeUnitId }),
      }));
      setData((current) => ({ ...current, requests: [response.request, ...current.requests] }));
      setForm(emptyForm);
      toast.success("Solicitação enviada ao Master. O prazo útil de 24 horas já começou.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar solicitação."); }
    finally { setSubmitting(false); }
  }

  function toggleConsultant(consultantId: string) {
    setForm((current) => ({
      ...current,
      consultantIds: current.consultantIds.includes(consultantId)
        ? current.consultantIds.filter((id) => id !== consultantId)
        : [...current.consultantIds, consultantId],
    }));
  }

  function openAttendance(item: AdRequest) {
    setAttendanceRequest(item);
    setAttendanceState("");
  }

  async function createAttendance() {
    if (!attendanceRequest || !/^[A-Za-z]{2}$/.test(attendanceState.trim())) {
      toast.error("Informe a UF com duas letras.");
      return;
    }
    setCreatingAttendance(true);
    try {
      const response = await readJson<{ request: AdRequest; attendanceId: string; alreadyExisted?: boolean }>(await fetch("/api/ad-requests", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: attendanceRequest.id, action: "create_attendance", state: attendanceState }),
      }));
      setData((current) => ({
        ...current,
        requests: current.requests.map((item) => item.id === response.request.id ? response.request : item),
      }));
      setAttendanceRequest(null);
      toast.success(response.alreadyExisted
        ? "A turma já existia e foi vinculada à solicitação, sem duplicar."
        : "Turma aberta e vinculada à solicitação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir turma.");
    } finally {
      setCreatingAttendance(false);
    }
  }

  async function update(item: AdRequest) {
    const draft = drafts[item.id];
    if (!draft) return;
    setUpdatingId(item.id);
    try {
      const response = await readJson<{ request: AdRequest }>(await fetch("/api/ad-requests", {
        method: "PATCH", credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, ...draft }),
      }));
      setData((current) => ({ ...current, requests: current.requests.map((request) => request.id === item.id ? response.request : request) }));
      setDrafts((current) => ({ ...current, [item.id]: { status: response.request.status, masterNote: response.request.masterNote } }));
      toast.success("Solicitação atualizada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atualizar."); }
    finally { setUpdatingId(null); }
  }

  const units = React.useMemo(() => Array.from(new Map(data.requests.map((item) => [item.unitId, item.unitName]))), [data.requests]);
  const filtered = data.requests.filter((item) => {
    const statusMatch = statusFilter === "todas" || (statusFilter === "ativas" ? !["concluido", "cancelado"].includes(item.status) : item.status === statusFilter);
    return statusMatch && (unitFilter === "todas" || item.unitId === unitFilter);
  });
  const grouped = Array.from(new Map(filtered.map((item) => [item.unitId, { name: item.unitName, items: filtered.filter((candidate) => candidate.unitId === item.unitId) }])).values());
  const active = data.requests.filter((item) => !["concluido", "cancelado"].includes(item.status));
  const overdue = active.filter((item) => new Date(item.dueAt).getTime() < now).length;
  const done = data.requests.filter((item) => item.status === "concluido").length;

  if (session && !canAccess) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="max-w-md text-center"><Megaphone className="mx-auto h-11 w-11 text-muted-foreground" /><h1 className="mt-4 text-xl font-bold">Área restrita à liderança</h1><p className="mt-2 text-sm text-muted-foreground">Solicitações de anúncios ficam disponíveis para Diretor, CEO e Master.</p></div></div>;
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader eyebrow="Marketing e performance" title="Solicitações de anúncios" description={data.canCreate ? "Solicite campanhas com briefing claro e acompanhe cada etapa até a entrega." : data.canManage ? "Centralize os pedidos das unidades, cuide dos prazos e mantenha a liderança informada." : "Acompanhe a demanda de anúncios da rede, organizada por unidade e prazo."} actions={<Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Atualizar</Button>} />

      <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(125deg,#061B4D_0%,#C2410C_48%,#F97316_100%)] p-6 text-white shadow-[0_30px_90px_-45px_rgba(194,65,12,.9)] md:p-8">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_75%_20%,white_0,transparent_26%),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:auto,34px_34px,34px_34px]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div><Badge className="border-white/20 bg-white/10 text-white">Central de campanhas</Badge><h2 className="mt-4 max-w-2xl text-2xl font-extrabold tracking-tight md:text-3xl">Do pedido à veiculação, sem perder contexto nem prazo.</h2><p className="mt-2 max-w-xl text-sm text-white/75">Cada nova solicitação recebe automaticamente um SLA de 24 horas úteis.</p></div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Na fila", value: active.length }, { label: "Atrasadas", value: overdue }, { label: "Concluídas", value: done }].map((stat) => <div key={stat.label} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur"><div className="text-2xl font-extrabold">{stat.value}</div><div className="mt-1 text-[11px] text-white/70">{stat.label}</div></div>)}
          </div>
        </div>
      </section>

      {data.canCreate ? (
        <Card className="overflow-hidden border-primary/15 shadow-card">
          <CardHeader className="border-b bg-[linear-gradient(90deg,rgba(249,115,22,.08),transparent)]"><CardTitle className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>Novo pedido de anúncio</CardTitle></CardHeader>
          <CardContent className="pt-6"><form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Curso *</Label><Select value={form.courseId} onValueChange={(courseId) => setForm((v) => ({ ...v, courseId }))}><SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger><SelectContent>{data.courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="ad-city">Cidade *</Label><Input id="ad-city" list="ad-cities" value={form.city} onChange={(event) => setForm((v) => ({ ...v, city: event.target.value }))} placeholder="Selecione ou digite" maxLength={100} /><datalist id="ad-cities">{data.cities.map((city) => <option value={city} key={city} />)}</datalist></div>
              <div className="space-y-2"><Label>Consultores *</Label><div className="max-h-36 space-y-1 overflow-y-auto rounded-md border bg-background p-2">{data.consultants.length ? data.consultants.map((consultant) => <label key={consultant.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><Checkbox checked={form.consultantIds.includes(consultant.id)} onCheckedChange={() => toggleConsultant(consultant.id)} /><span className="truncate">{consultant.name}</span></label>) : <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum consultor ativo nesta unidade.</p>}</div><p className="text-xs text-muted-foreground">{form.consultantIds.length ? `${form.consultantIds.length} selecionado(s)` : "Selecione um ou mais"}</p></div>
              <div className="space-y-2"><Label htmlFor="class-date">Data da turma *</Label><Input id="class-date" type="date" value={form.classDate} onChange={(event) => setForm((v) => ({ ...v, classDate: event.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="observation">Observação <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="observation" value={form.observation} onChange={(event) => setForm((v) => ({ ...v, observation: event.target.value }))} placeholder="Inclua objetivo, oferta, público, diferenciais ou algum cuidado importante para a campanha." maxLength={1600} rows={3} /></div>
            <div className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/[.04] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-primary" /><span>Prazo calculado em <strong className="text-foreground">24 horas úteis</strong>, sem contar sábado e domingo.</span></div><Button type="submit" disabled={submitting} className="gap-2 bg-gradient-primary sm:min-w-44">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar solicitação</Button></div>
          </form></CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-xl font-bold">{data.canCreate ? "Minhas solicitações" : "Fila de solicitações"}</h2><p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "pedido exibido" : "pedidos exibidos"}</p></div><div className="flex flex-col gap-2 sm:flex-row"><Tabs value={statusFilter} onValueChange={setStatusFilter}><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="ativas">Ativas</TabsTrigger><TabsTrigger value="novo">Novas</TabsTrigger><TabsTrigger value="em_producao">Em produção</TabsTrigger><TabsTrigger value="concluido">Concluídas</TabsTrigger><TabsTrigger value="todas">Todas</TabsTrigger></TabsList></Tabs>{units.length > 1 ? <Select value={unitFilter} onValueChange={setUnitFilter}><SelectTrigger className="w-full sm:w-52"><Building2 className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as unidades</SelectItem>{units.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select> : null}</div></div>

        {loading ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : grouped.length ? grouped.map((group) => (
          <div key={group.name} className="space-y-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span><h3 className="font-bold">{group.name}</h3><Badge variant="secondary">{group.items.length}</Badge></div><div className="grid gap-4 xl:grid-cols-2">{group.items.map((item) => {
            const draft = drafts[item.id] ?? { status: item.status, masterNote: item.masterNote };
            return <Card key={item.id} className={cn("overflow-hidden border-l-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card", item.status === "novo" ? "border-l-primary" : item.status === "concluido" ? "border-l-emerald-500" : "border-l-blue-500")}><CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-extrabold">{item.courseName}</h4><Badge variant="outline" className={statusTone[item.status]}>{adRequestStatusLabels[item.status]}</Badge>{!item.isRead && data.canManage ? <Badge className="bg-primary">Nova para você</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">Solicitado por {item.createdByName} em {formatDate(item.createdAt, true)}</p></div><div className="rounded-lg bg-muted/60 px-3 py-2 text-xs"><SlaClock request={item} now={now} /></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"><div className="flex items-center gap-2 rounded-lg bg-muted/45 p-2.5"><MapPin className="h-4 w-4 text-primary" /><span className="truncate">{item.city}</span></div><div className="flex items-center gap-2 rounded-lg bg-muted/45 p-2.5"><UsersRound className="h-4 w-4 shrink-0 text-primary" /><span className="truncate" title={item.consultantNames.join(", ")}>{item.consultantNames.join(", ")}</span></div><div className="col-span-2 flex items-center gap-2 rounded-lg bg-muted/45 p-2.5 sm:col-span-1"><CalendarDays className="h-4 w-4 text-primary" /><span>{formatDate(item.classDate)}</span></div></div>
              {item.observation ? <div className="mt-3 rounded-lg border bg-background p-3 text-sm"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Observação do Diretor</span><p className="mt-1 whitespace-pre-wrap text-foreground/80">{item.observation}</p></div> : null}
              {data.canManage ? <div className="mt-4 space-y-3 rounded-xl border border-primary/10 bg-primary/[.025] p-3"><div className="grid gap-3 sm:grid-cols-[210px_1fr]"><div className="space-y-1.5"><Label className="text-xs">Etapa da solicitação</Label><Select value={draft.status} onValueChange={(status: AdRequestStatus) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, status } }))}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent>{AD_REQUEST_STATUSES.map((status) => <SelectItem value={status} key={status}>{adRequestStatusLabels[status]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs">Retorno do Master</Label><Input className="bg-background" value={draft.masterNote} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, masterNote: event.target.value } }))} placeholder="Ex.: criativo em produção, aguardando material..." maxLength={1600} /></div></div><div className="flex flex-wrap justify-end gap-2">{item.attendanceId ? <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" />Turma já aberta</Badge> : <Button size="sm" variant="outline" className="gap-2" onClick={() => openAttendance(item)}><BookOpenCheck className="h-3.5 w-3.5" />Abrir turma</Button>}<Button size="sm" className="gap-2" disabled={updatingId === item.id} onClick={() => void update(item)}>{updatingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Salvar andamento</Button></div></div> : item.masterNote ? <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><strong>Retorno do Master:</strong> {item.masterNote}</div> : null}
            </CardContent></Card>;
          })}</div></div>
        )) : <Card><CardContent className="flex min-h-52 flex-col items-center justify-center text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Inbox className="h-6 w-6 text-muted-foreground" /></span><h3 className="mt-3 font-bold">Nenhuma solicitação neste filtro</h3><p className="mt-1 text-sm text-muted-foreground">Os novos pedidos aparecerão aqui, organizados por unidade.</p></CardContent></Card>}
      </section>

      <Dialog open={Boolean(attendanceRequest)} onOpenChange={(open) => !open && setAttendanceRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Abrir turma pela solicitação</DialogTitle><DialogDescription>Confira os dados preenchidos pelo Diretor. O sistema verificará novamente se a turma já existe antes de criar.</DialogDescription></DialogHeader>
          {attendanceRequest ? <div className="space-y-4"><div className="grid gap-2 rounded-xl border bg-muted/35 p-4 text-sm sm:grid-cols-2"><div><span className="text-xs text-muted-foreground">Unidade</span><p className="font-semibold">{attendanceRequest.unitName}</p></div><div><span className="text-xs text-muted-foreground">Curso</span><p className="font-semibold">{attendanceRequest.courseName}</p></div><div><span className="text-xs text-muted-foreground">Cidade</span><p className="font-semibold">{attendanceRequest.city}</p></div><div><span className="text-xs text-muted-foreground">Data</span><p className="font-semibold">{formatDate(attendanceRequest.classDate)}</p></div><div className="sm:col-span-2"><span className="text-xs text-muted-foreground">Consultores</span><p className="font-semibold">{attendanceRequest.consultantNames.join(", ")}</p></div></div><div className="space-y-2"><Label htmlFor="attendance-state">UF *</Label><Input id="attendance-state" value={attendanceState} onChange={(event) => setAttendanceState(event.target.value.toUpperCase().slice(0, 2))} placeholder="Ex.: SP" maxLength={2} className="uppercase" /></div></div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setAttendanceRequest(null)} disabled={creatingAttendance}>Cancelar</Button><Button onClick={() => void createAttendance()} disabled={creatingAttendance} className="gap-2 bg-gradient-primary">{creatingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}Conferir e abrir turma</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
