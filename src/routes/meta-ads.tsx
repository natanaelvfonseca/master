import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FormInput,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RadioTower,
  Route as RouteIcon,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { canManageMetaAds, canViewMetaAds } from "@/lib/auth-types";
import { useAuth } from "@/lib/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MetaIntegration = {
  id: string;
  app_id: string | null;
  graph_api_version: string;
  status: "active" | "inactive";
  callback_url: string | null;
  last_communication_at: string | null;
  total_events_received: number;
  total_leads_created: number;
  total_errors: number;
  appSecret: "configured" | null;
  verifyToken: "configured" | null;
};

type MetaPage = {
  id: string;
  page_name: string;
  page_id: string;
  token_status: "unknown" | "valid" | "invalid";
  last_validated_at: string | null;
  subscription_status: "unknown" | "subscribed" | "not_subscribed" | "error";
  leads_received_count: number;
  status: "active" | "inactive";
  last_error: string | null;
  tokenMasked: string | null;
  formsCount: number;
};

type MetaForm = {
  id: string;
  page_id: string;
  page_name: string;
  meta_page_id: string;
  form_name: string;
  meta_form_id: string;
  unit_id: string | null;
  unit_name: string | null;
  course_id: string | null;
  course_name: string | null;
  funnel_name: string | null;
  initial_stage: string;
  acquisition_channel_id: string | null;
  acquisition_channel_name: string | null;
  default_responsible_id: string | null;
  default_responsible_name: string | null;
  distribution_rule: string;
  field_mapping: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
  selected_consultant_ids: Array<string>;
  status: "active" | "inactive";
  configured_at: string | null;
  synced_at: string | null;
  last_lead_received_at: string | null;
  leads_received_count: number;
};

type MetaEvent = {
  id: string;
  lead_id: string | null;
  page_id: string;
  form_id: string;
  leadgen_id: string;
  campaign_name: string | null;
  ad_name: string | null;
  received_at: string;
  processed_at: string | null;
  status: string;
  error_message: string | null;
  distribution_reason: string | null;
  routing_source: "campaign_matrix" | "form_fallback" | null;
  routing_error: string | null;
};

type OptionRow = {
  id: string;
  unitId?: string;
  name: string;
  status?: string;
  role?: string;
};

type MetaState = {
  integration: MetaIntegration;
  pages: Array<MetaPage>;
  forms: Array<MetaForm>;
  events: Array<MetaEvent>;
  campaignAlerts: Array<{
    campaignId: string | null;
    campaignName: string;
    reason: string;
    count: number;
  }>;
  options: {
    units: Array<OptionRow>;
    courses: Array<OptionRow>;
    channels: Array<OptionRow>;
    consultants: Array<OptionRow>;
  };
};

type IntegrationForm = {
  appId: string;
  appSecret: string;
  verifyToken: string;
  graphApiVersion: string;
  callbackUrl: string;
  status: "active" | "inactive";
};

type PageForm = {
  pageName: string;
  pageId: string;
  pageAccessToken: string;
  status: "active" | "inactive";
};

type FormConfig = {
  pageDbId: string;
  formName: string;
  metaFormId: string;
  unitId: string;
  courseId: string;
  funnelName: string;
  initialStage: string;
  acquisitionChannelId: string;
  fieldMapping: string;
  settings: string;
  status: "active" | "inactive";
};

const NO_SELECTION = "__none__";

const stages = [
  "Novo lead",
  "Em contato",
  "Qualificado",
  "Proposta",
  "Pagamento pendente",
  "Confirmado",
  "Recuperação",
  "Matriculado",
];

const defaultMapping = JSON.stringify(
  [
    { source: "full_name", target: "fullName", required: false, transform: "none" },
    { source: "phone_number", target: "phone", required: false, transform: "phone_digits" },
    { source: "email", target: "email", required: false, transform: "lowercase" },
    { source: "qual_sua_cidade", target: "city", required: false, transform: "none" },
    { source: "qual_curso_voce_deseja", target: "courseName", required: false, transform: "none" },
  ],
  null,
  2,
);

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha na requisição.");
  }

  return data;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (["active", "valid", "subscribed", "processed"].includes(status)) {
    return "bg-success/10 text-success";
  }

  if (["pending_configuration", "unknown", "received"].includes(status)) {
    return "bg-gold/15 text-gold-foreground";
  }

  return "bg-destructive/10 text-destructive";
}

function emptyPageForm(): PageForm {
  return {
    pageName: "",
    pageId: "",
    pageAccessToken: "",
    status: "active",
  };
}

function emptyFormConfig(pageDbId = ""): FormConfig {
  return {
    pageDbId,
    formName: "",
    metaFormId: "",
    unitId: "",
    courseId: "",
    funnelName: "Captação",
    initialStage: "Novo lead",
    acquisitionChannelId: "",
    fieldMapping: defaultMapping,
    settings: "{}",
    status: "active",
  };
}

export const Route = createFileRoute("/meta-ads")({
  head: () => ({ meta: [{ title: "Meta Ads · Plenarius Growth Hub" }] }),
  component: MetaAdsPage,
});

function MetaAdsPage() {
  const { session } = useAuth();
  const [state, setState] = React.useState<MetaState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [pageDialogOpen, setPageDialogOpen] = React.useState(false);
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false);
  const [pageForm, setPageForm] = React.useState<PageForm>(() => emptyPageForm());
  const [formConfig, setFormConfig] = React.useState<FormConfig>(() => emptyFormConfig());
  const [duplicateSource, setDuplicateSource] = React.useState<MetaForm | null>(null);
  const [duplicateFormId, setDuplicateFormId] = React.useState("");
  const [duplicateName, setDuplicateName] = React.useState("");
  const [integrationForm, setIntegrationForm] = React.useState<IntegrationForm>({
    appId: "",
    appSecret: "",
    verifyToken: "",
    graphApiVersion: "v23.0",
    callbackUrl: "/api/webhooks/meta-leads",
    status: "inactive",
  });

  const canAccess = session ? canViewMetaAds(session.user.role) : false;
  const canManage = session ? canManageMetaAds(session.user.role) : false;
  const pendingEvents = state?.events.filter((event) => event.status === "pending_configuration") ?? [];
  const configuredForms =
    state?.forms.filter((form) => form.status === "active" && form.unit_id).length ?? 0;
  const activeForms = state?.forms.filter((form) => form.status === "active").length ?? 0;

  const loadState = React.useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await readJson<MetaState>(
        await fetch("/api/integrations/meta-ads", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        }),
      );

      setState(data);
      setIntegrationForm({
        appId: data.integration.app_id ?? "",
        appSecret: "",
        verifyToken: "",
        graphApiVersion: data.integration.graph_api_version || "v23.0",
        callbackUrl: data.integration.callback_url ?? "/api/webhooks/meta-leads",
        status: data.integration.status,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar Meta Ads.");
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  if (session && !canAccess) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A integração Meta Ads fica disponível para usuários Master e Marketing.
          </p>
        </div>
      </div>
    );
  }

  async function postAction(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);

    try {
      await readJson<{ ok: true }>(
        await fetch("/api/integrations/meta-ads", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      toast.success(successMessage);
      await loadState();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na operação.");
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  function openFormDialog(form?: MetaForm, fromEvent?: MetaEvent) {
    if (form) {
      setFormConfig({
        pageDbId: form.page_id,
        formName: form.form_name,
        metaFormId: form.meta_form_id,
        unitId: form.unit_id ?? "",
        courseId: form.course_id ?? "",
        funnelName: form.funnel_name ?? "",
        initialStage: form.initial_stage,
        acquisitionChannelId: form.acquisition_channel_id ?? "",
        fieldMapping: JSON.stringify(form.field_mapping ?? [], null, 2),
        settings: JSON.stringify(form.settings ?? {}, null, 2),
        status: form.status,
      });
    } else {
      const page = state?.pages.find((item) => item.page_id === fromEvent?.page_id) ?? state?.pages[0];
      setFormConfig({
        ...emptyFormConfig(page?.id ?? ""),
        formName: fromEvent?.form_id ? `Formulário ${fromEvent.form_id}` : "",
        metaFormId: fromEvent?.form_id ?? "",
      });
    }

    setFormDialogOpen(true);
  }

  function submitFormConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formConfig.pageDbId || !formConfig.formName || !formConfig.metaFormId) {
      toast.error("Página, nome e Form ID são obrigatórios.");
      return;
    }

    void postAction({ action: "saveForm", ...formConfig }, "Formulário configurado.");
    setFormDialogOpen(false);
  }

  const pageOptions = state?.pages ?? [];
  const unitCourses = state?.options.courses.filter((item) => item.unitId === formConfig.unitId) ?? [];
  const unitChannels = state?.options.channels.filter((item) => item.unitId === formConfig.unitId) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Meta Ads"
        description="Central para receber Formulários Instantâneos de várias Páginas, campanhas, unidades e cursos no Kanban."
        actions={
          <>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Webhook único
            </Badge>
            {canManage ? (
              <Button onClick={() => setPageDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="h-4 w-4" />
                Página
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={RadioTower} label="Páginas" value={state?.pages.length ?? 0} />
        <MetricCard icon={FormInput} label="Formulários ativos" value={activeForms} />
        <MetricCard icon={RouteIcon} label="Configurados" value={configuredForms} />
        <MetricCard icon={AlertTriangle} label="Pendentes" value={pendingEvents.length} tone="gold" />
      </div>

      {state?.campaignAlerts.length ? (
        <Card className="border-gold/40 bg-gold/10 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-gold-foreground">
              <AlertTriangle className="h-4 w-4" />
              Campanhas usando distribuição padrão
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {state.campaignAlerts.map((alert) => (
              <div
                key={`${alert.campaignId ?? alert.campaignName}-${alert.reason}`}
                className="flex flex-col gap-1 rounded-md border border-gold/30 bg-white/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold">{alert.campaignName}</div>
                  <div className="text-xs text-muted-foreground">{alert.reason}</div>
                </div>
                <Badge variant="secondary">{alert.count} lead(s)</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList
          className={`grid h-auto grid-cols-2 gap-1 bg-primary/5 p-1 ${
            canManage ? "md:grid-cols-5" : "md:grid-cols-2"
          }`}
        >
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          {canManage ? <TabsTrigger value="pages">Páginas</TabsTrigger> : null}
          {canManage ? <TabsTrigger value="forms">Formulários</TabsTrigger> : null}
          <TabsTrigger value="events">Eventos</TabsTrigger>
          {canManage ? <TabsTrigger value="settings">Configurações</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
            <Card className="border-primary/10 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Eventos recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <EventTable
                  events={(state?.events ?? []).slice(0, 8)}
                  readOnly={!canManage}
                  onReprocess={(event) => {
                    setBusyAction(event.id);
                    void postAction({ action: "reprocessEvent", eventId: event.id }, "Evento reprocessado.");
                  }}
                  onConfigure={(event) => openFormDialog(undefined, event)}
                  busyAction={busyAction}
                />
              </CardContent>
            </Card>
            <Card className="border-primary/10 bg-[linear-gradient(135deg,rgba(11,42,111,.04),rgba(227,170,43,.08))] shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Operação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SummaryLine label="Eventos recebidos" value={state?.integration.total_events_received ?? 0} />
                <SummaryLine label="Leads criados" value={state?.integration.total_leads_created ?? 0} />
                <SummaryLine label="Erros" value={state?.integration.total_errors ?? 0} />
                <SummaryLine
                  label="Última comunicação"
                  value={formatDate(state?.integration.last_communication_at ?? null)}
                />
                <SummaryLine label="Callback" value={state?.integration.callback_url ?? "/api/webhooks/meta-leads"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <Card className="border-primary/10 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Páginas conectadas</CardTitle>
              <Button onClick={() => setPageDialogOpen(true)} className="bg-gradient-primary">
                <Plus className="h-4 w-4" />
                Nova Página
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead>Page ID</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Formulários</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageOptions.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-semibold">{page.page_name}</TableCell>
                        <TableCell>{page.page_id}</TableCell>
                        <TableCell>
                          <Badge className={statusClass(page.token_status)}>{page.token_status}</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{page.tokenMasked ?? "--"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusClass(page.subscription_status)}>
                            {page.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{page.formsCount}</TableCell>
                        <TableCell>{page.leads_received_count}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <IconAction
                              label="Validar token"
                              icon={KeyRound}
                              loading={busyAction === `validate-${page.id}`}
                              onClick={() => {
                                setBusyAction(`validate-${page.id}`);
                                void postAction(
                                  { action: "validatePageToken", pageDbId: page.id },
                                  "Token validado.",
                                );
                              }}
                            />
                            <IconAction
                              label="Inscrever leadgen"
                              icon={CheckCircle2}
                              loading={busyAction === `subscribe-${page.id}`}
                              onClick={() => {
                                setBusyAction(`subscribe-${page.id}`);
                                void postAction(
                                  { action: "subscribePage", pageDbId: page.id },
                                  "Página inscrita no leadgen.",
                                );
                              }}
                            />
                            <IconAction
                              label="Sincronizar formulários"
                              icon={RefreshCw}
                              loading={busyAction === `sync-${page.id}`}
                              onClick={() => {
                                setBusyAction(`sync-${page.id}`);
                                void postAction(
                                  { action: "syncForms", pageDbId: page.id },
                                  "Formulários sincronizados.",
                                );
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms">
          <Card className="border-primary/10 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Formulários</CardTitle>
              <Button onClick={() => openFormDialog()} className="bg-gradient-primary">
                <Plus className="h-4 w-4" />
                Cadastrar
              </Button>
            </CardHeader>
            <CardContent>
              <FormsTable
                forms={state?.forms ?? []}
                onEdit={openFormDialog}
                onDuplicate={(form) => {
                  setDuplicateSource(form);
                  setDuplicateFormId("");
                  setDuplicateName(`${form.form_name} - cópia`);
                  setDuplicateDialogOpen(true);
                }}
                onReprocess={() => {
                  const firstPending = pendingEvents[0];
                  if (!firstPending) {
                    toast.info("Nenhum evento pendente para reprocessar.");
                    return;
                  }
                  setBusyAction(firstPending.id);
                  void postAction(
                    { action: "reprocessEvent", eventId: firstPending.id },
                    "Evento reprocessado.",
                  );
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="border-primary/10 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Histórico de eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <EventTable
                events={state?.events ?? []}
                readOnly={!canManage}
                onReprocess={(event) => {
                  setBusyAction(event.id);
                  void postAction({ action: "reprocessEvent", eventId: event.id }, "Evento reprocessado.");
                }}
                onConfigure={(event) => openFormDialog(undefined, event)}
                busyAction={busyAction}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-primary/10 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Configuração global</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void postAction(
                    { action: "saveIntegration", ...integrationForm },
                    "Integração salva.",
                  );
                }}
              >
                <Field label="App ID">
                  <Input
                    value={integrationForm.appId}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({ ...current, appId: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Graph API">
                  <Input
                    value={integrationForm.graphApiVersion}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        graphApiVersion: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="App Secret">
                  <Input
                    type="password"
                    value={integrationForm.appSecret}
                    placeholder={state?.integration.appSecret ? "Configurado" : ""}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        appSecret: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Verify Token">
                  <Input
                    type="password"
                    value={integrationForm.verifyToken}
                    placeholder={state?.integration.verifyToken ? "Configurado" : ""}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        verifyToken: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Callback URL">
                  <Input
                    value={integrationForm.callbackUrl}
                    onChange={(event) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        callbackUrl: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={integrationForm.status}
                    onValueChange={(value) =>
                      setIntegrationForm((current) => ({
                        ...current,
                        status: value as "active" | "inactive",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-gradient-primary" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                    Salvar configuração
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PageDialog
        open={pageDialogOpen}
        form={pageForm}
        saving={saving}
        onOpenChange={setPageDialogOpen}
        onFormChange={setPageForm}
        onSubmit={(event) => {
          event.preventDefault();
          void postAction({ action: "savePage", ...pageForm }, "Página salva.");
          setPageDialogOpen(false);
          setPageForm(emptyPageForm());
        }}
      />

      <FormDialog
        open={formDialogOpen}
        form={formConfig}
        pages={pageOptions}
        units={state?.options.units ?? []}
        courses={unitCourses}
        channels={unitChannels}
        saving={saving}
        onOpenChange={setFormDialogOpen}
        onFormChange={setFormConfig}
        onSubmit={submitFormConfig}
      />

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="border-primary/20 bg-card shadow-elegant">
          <DialogHeader>
            <DialogTitle>Duplicar configuração</DialogTitle>
            <DialogDescription>
              Copia destino e mapeamento para um novo Form ID.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Field label="Novo Form ID">
              <Input value={duplicateFormId} onChange={(event) => setDuplicateFormId(event.target.value)} />
            </Field>
            <Field label="Nome">
              <Input value={duplicateName} onChange={(event) => setDuplicateName(event.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-primary"
              disabled={!duplicateSource || !duplicateFormId || saving}
              onClick={() => {
                if (!duplicateSource) {
                  return;
                }
                void postAction(
                  {
                    action: "duplicateForm",
                    sourceFormId: duplicateSource.id,
                    metaFormId: duplicateFormId,
                    formName: duplicateName,
                  },
                  "Configuração duplicada.",
                );
                setDuplicateDialogOpen(false);
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "blue" | "gold";
}) {
  return (
    <Card className="border-primary/10 shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={
            tone === "gold"
              ? "flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15 text-gold-foreground"
              : "flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-black text-foreground">{value}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-white/70 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[55%] break-words text-right font-semibold text-primary">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function IconAction({
  label,
  icon: Icon,
  loading,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="icon" variant="ghost" onClick={onClick} aria-label={label} title={label}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </Button>
  );
}

function FormsTable({
  forms,
  onEdit,
  onDuplicate,
  onReprocess,
}: {
  forms: Array<MetaForm>;
  onEdit: (form: MetaForm) => void;
  onDuplicate: (form: MetaForm) => void;
  onReprocess: () => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Form ID</TableHead>
          <TableHead>Página</TableHead>
          <TableHead>Unidade</TableHead>
          <TableHead>Curso</TableHead>
          <TableHead>Etapa</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {forms.map((form) => (
          <TableRow key={form.id}>
            <TableCell className="font-semibold">{form.form_name}</TableCell>
            <TableCell>{form.meta_form_id}</TableCell>
            <TableCell>{form.page_name}</TableCell>
            <TableCell>{form.unit_name ?? "Pendente"}</TableCell>
            <TableCell>{form.course_name ?? "--"}</TableCell>
            <TableCell>{form.initial_stage}</TableCell>
            <TableCell>{form.leads_received_count}</TableCell>
            <TableCell>
              <Badge className={statusClass(form.status)}>{form.status === "active" ? "Ativo" : "Inativo"}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(form)}>
                  Configurar
                </Button>
                <IconAction label="Duplicar" icon={Copy} onClick={() => onDuplicate(form)} />
                <IconAction label="Reprocessar pendências" icon={RefreshCw} onClick={onReprocess} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EventTable({
  events,
  busyAction,
  readOnly = false,
  onReprocess,
  onConfigure,
}: {
  events: Array<MetaEvent>;
  busyAction: string | null;
  readOnly?: boolean;
  onReprocess: (event: MetaEvent) => void;
  onConfigure: (event: MetaEvent) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recebido</TableHead>
          <TableHead>Page/Form</TableHead>
          <TableHead>Leadgen</TableHead>
          <TableHead>Campanha</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>{formatDate(event.received_at)}</TableCell>
            <TableCell>
              <div>{event.page_id}</div>
              <div className="text-xs text-muted-foreground">{event.form_id}</div>
            </TableCell>
            <TableCell>{event.leadgen_id}</TableCell>
            <TableCell>{event.campaign_name ?? event.ad_name ?? "--"}</TableCell>
            <TableCell>
              <Badge className={statusClass(event.status)}>{event.status}</Badge>
              {event.routing_source ? (
                <div className="mt-1 text-xs font-medium text-muted-foreground">
                  {event.routing_source === "campaign_matrix"
                    ? "Curso + cidade"
                    : "Padrão do formulário"}
                </div>
              ) : null}
              {event.error_message ? (
                <div className="mt-1 max-w-64 text-xs text-destructive">{event.error_message}</div>
              ) : null}
              {event.routing_error ? (
                <div className="mt-1 max-w-64 text-xs text-gold-foreground">
                  {event.routing_error}
                </div>
              ) : null}
            </TableCell>
            <TableCell>
              {!readOnly ? (
                <div className="flex justify-end gap-1.5">
                {event.status === "pending_configuration" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onConfigure(event)}>
                    Configurar formulário
                  </Button>
                ) : null}
                <IconAction
                  label="Reprocessar"
                  icon={RefreshCw}
                  loading={busyAction === event.id}
                  onClick={() => onReprocess(event)}
                />
                </div>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PageDialog({
  open,
  form,
  saving,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  form: PageForm;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<PageForm>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-card shadow-elegant">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Conectar Página</DialogTitle>
            <DialogDescription>O token é criptografado no banco e exibido apenas mascarado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <Field label="Nome da Página">
              <Input value={form.pageName} onChange={(event) => onFormChange((current) => ({ ...current, pageName: event.target.value }))} required />
            </Field>
            <Field label="Page ID">
              <Input value={form.pageId} onChange={(event) => onFormChange((current) => ({ ...current, pageId: event.target.value }))} required />
            </Field>
            <Field label="Page Access Token">
              <Input type="password" value={form.pageAccessToken} onChange={(event) => onFormChange((current) => ({ ...current, pageAccessToken: event.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => onFormChange((current) => ({ ...current, status: value as PageForm["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary" disabled={saving}>Salvar Página</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormDialog({
  open,
  form,
  pages,
  units,
  courses,
  channels,
  saving,
  onOpenChange,
  onFormChange,
  onSubmit,
}: {
  open: boolean;
  form: FormConfig;
  pages: Array<MetaPage>;
  units: Array<OptionRow>;
  courses: Array<OptionRow>;
  channels: Array<OptionRow>;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: React.Dispatch<React.SetStateAction<FormConfig>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-primary/20 bg-card shadow-elegant sm:max-w-4xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Configurar formulário</DialogTitle>
            <DialogDescription>Destino e mapeamento ficam isolados por Page ID + Form ID.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 md:grid-cols-2">
            <Field label="Página">
              <Select value={form.pageDbId} onValueChange={(value) => onFormChange((current) => ({ ...current, pageDbId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {pages.map((page) => <SelectItem key={page.id} value={page.id}>{page.page_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Form ID">
              <Input value={form.metaFormId} onChange={(event) => onFormChange((current) => ({ ...current, metaFormId: event.target.value }))} required />
            </Field>
            <Field label="Nome">
              <Input value={form.formName} onChange={(event) => onFormChange((current) => ({ ...current, formName: event.target.value }))} required />
            </Field>
            <Field label="Unidade de fallback">
              <Select value={form.unitId || NO_SELECTION} onValueChange={(value) => onFormChange((current) => ({ ...current, unitId: value === NO_SELECTION ? "" : value, courseId: "", acquisitionChannelId: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>Pendente</SelectItem>
                  {units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Curso de fallback">
              <Select value={form.courseId || NO_SELECTION} onValueChange={(value) => onFormChange((current) => ({ ...current, courseId: value === NO_SELECTION ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>Curso do formulário ou sem curso</SelectItem>
                  {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Canal de aquisição">
              <Select value={form.acquisitionChannelId || NO_SELECTION} onValueChange={(value) => onFormChange((current) => ({ ...current, acquisitionChannelId: value === NO_SELECTION ? "" : value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>Sem canal</SelectItem>
                  {channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Funil">
              <Input value={form.funnelName} onChange={(event) => onFormChange((current) => ({ ...current, funnelName: event.target.value }))} />
            </Field>
            <Field label="Etapa inicial">
              <Select value={form.initialStage} onValueChange={(value) => onFormChange((current) => ({ ...current, initialStage: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mapeamento de campos opcional">
              <Textarea className="min-h-56 font-mono text-xs" value={form.fieldMapping} onChange={(event) => onFormChange((current) => ({ ...current, fieldMapping: event.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(value) => onFormChange((current) => ({ ...current, status: value as FormConfig["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-gradient-primary" disabled={saving}>Salvar formulário</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
