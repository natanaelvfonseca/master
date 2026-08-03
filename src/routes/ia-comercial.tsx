import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Power,
  QrCode,
  RefreshCw,
  Save,
  ScrollText,
  Sparkles,
  Target,
  UserCheck,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  canViewAttendances,
  canViewSalesAi,
  getInitials,
  isExecutiveRole,
  isMasterRole,
} from "@/lib/auth-types";
import type {
  SalesAiConsultantSummary,
  SalesAiCourseOption,
  SalesAiDashboardResponse,
  SalesConversationAnalysis,
  SalesScriptRecord,
} from "@/lib/sales-ai-types";
import { cn } from "@/lib/utils";

const ATTENDANCE_ALL_UNITS = "__all__";

type ScriptForm = {
  courseId: string;
  title: string;
  scriptBody: string;
  active: boolean;
};

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type EvolutionState = {
  configured: boolean;
  instance: {
    id: string;
    name: string;
    status: ConnectionStatus;
    phoneNumber: string | null;
    connectedAt: string | null;
    lastEventAt: string | null;
  } | null;
};

const emptyScriptForm: ScriptForm = {
  courseId: "",
  title: "",
  scriptBody: "",
  active: true,
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const Route = createFileRoute("/ia-comercial")({
  head: () => ({ meta: [{ title: "IA Comercial | Master Hub" }] }),
  component: SalesAiPage,
});

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...init?.headers },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data;
}

function buildUrl(path: string, params: Record<string, string | null | undefined>) {
  const url = new URL(path, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return `${url.pathname}${url.search}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Sem registro" : dateFormatter.format(date);
}

function scoreTone(score: number) {
  if (score >= 82) return "text-success";
  if (score >= 65) return "text-gold";
  return "text-destructive";
}

function scoreBadge(score: number) {
  if (score >= 82) return "border-success/25 bg-success/10 text-success";
  if (score >= 65) return "border-gold/30 bg-gold/15 text-gold-foreground";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

function statusIcon(status: SalesAiConsultantSummary["status"]) {
  return status === "connected" ? Wifi : WifiOff;
}

function statusLabel(status: SalesAiConsultantSummary["status"]) {
  return status === "connected" ? "Online" : "Offline";
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  return digits ? `+${digits}` : "WhatsApp conectado";
}

function whatsappStatusInfo(status: ConnectionStatus | undefined) {
  if (status === "connected") {
    return {
      label: "WhatsApp conectado",
      icon: Wifi,
      className: "border-success/25 bg-success/10 text-success",
    };
  }

  if (status === "connecting") {
    return {
      label: "Aguardando QR Code",
      icon: QrCode,
      className: "border-gold/30 bg-gold/15 text-gold-foreground",
    };
  }

  if (status === "error") {
    return {
      label: "Falha na conexão",
      icon: CircleAlert,
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    };
  }

  return {
    label: "WhatsApp desconectado",
    icon: WifiOff,
    className: "border-muted bg-muted/70 text-muted-foreground",
  };
}

function findScriptForCourse(scripts: Array<SalesScriptRecord>, courseId: string) {
  return scripts.find((script) => script.courseId === courseId) ?? null;
}

function firstScriptCourseForConsultant(
  consultant: SalesAiConsultantSummary | null,
  scripts: Array<SalesScriptRecord>,
) {
  if (!consultant) {
    return "";
  }

  return scripts.find((script) => script.unitId === consultant.unitId && script.active)?.courseId ?? "";
}

function SalesAiPage() {
  const { session } = useAuth();
  const canAccess = session ? canViewSalesAi(session.user.role) : false;
  const canViewLeadershipArea = session ? canViewAttendances(session.user.role) : false;
  const consultantView = session?.user.role === "CONSULTOR";
  const canUseUnitFilter =
    Boolean(session && (isMasterRole(session.user.role) || isExecutiveRole(session.user.role)));
  const [unitFilter, setUnitFilter] = React.useState(ATTENDANCE_ALL_UNITS);
  const [loading, setLoading] = React.useState(true);
  const [savingScript, setSavingScript] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [courses, setCourses] = React.useState<Array<SalesAiCourseOption>>([]);
  const [scripts, setScripts] = React.useState<Array<SalesScriptRecord>>([]);
  const [consultants, setConsultants] = React.useState<Array<SalesAiConsultantSummary>>([]);
  const [selectedConsultantId, setSelectedConsultantId] = React.useState<string>("");
  const [analysisCourseId, setAnalysisCourseId] = React.useState<string>("");
  const [selectedScriptCourseId, setSelectedScriptCourseId] = React.useState<string>("");
  const [scriptForm, setScriptForm] = React.useState<ScriptForm>(emptyScriptForm);
  const [evolutionState, setEvolutionState] = React.useState<EvolutionState | null>(null);
  const [loadingEvolution, setLoadingEvolution] = React.useState(true);
  const [workingEvolution, setWorkingEvolution] = React.useState(false);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [qrOpen, setQrOpen] = React.useState(false);

  const selectedConsultant = React.useMemo(
    () => consultants.find((consultant) => consultant.id === selectedConsultantId) ?? null,
    [consultants, selectedConsultantId],
  );
  const selectedAnalysis = selectedConsultant?.latestAnalysis ?? null;
  const availableScriptsForConsultant = React.useMemo(
    () =>
      selectedConsultant
        ? scripts.filter((script) => script.unitId === selectedConsultant.unitId && script.active)
        : [],
    [scripts, selectedConsultant],
  );
  const selectedCourse = courses.find((course) => course.id === selectedScriptCourseId) ?? null;
  const scriptedCourses = React.useMemo(
    () => new Set(scripts.filter((script) => script.active).map((script) => script.courseId)),
    [scripts],
  );
  const analyzedCount = React.useMemo(
    () => consultants.filter((consultant) => consultant.latestAnalysis).length,
    [consultants],
  );
  const averageScore =
    analyzedCount > 0
      ? Math.round(
          consultants.reduce((total, consultant) => total + (consultant.latestAnalysis?.score ?? 0), 0) /
            analyzedCount,
        )
      : 0;
  const messages30d = consultants.reduce((total, consultant) => total + consultant.messageCount30d, 0);

  const loadEvolutionState = React.useCallback(async (silent = false) => {
    if (!session || !canAccess) {
      setLoadingEvolution(false);
      return;
    }

    if (!silent) {
      setLoadingEvolution(true);
    }

    try {
      const data = await requestJson<{ ok: true } & EvolutionState>("/api/integrations/evolution");
      setEvolutionState({ configured: data.configured, instance: data.instance });

      if (data.instance?.status === "connected") {
        setQrCode(null);
        setQrOpen(false);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Falha ao verificar WhatsApp.");
      }
    } finally {
      if (!silent) {
        setLoadingEvolution(false);
      }
    }
  }, [canAccess, session]);

  const loadData = React.useCallback(
    async (silent = false) => {
      if (!session || !canViewLeadershipArea) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await requestJson<SalesAiDashboardResponse>(
          buildUrl("/api/ia-comercial", {
            unitId: canUseUnitFilter ? unitFilter : undefined,
          }),
        );

        setCourses(data.courses);
        setScripts(data.scripts);
        setConsultants(data.consultants);
        setSelectedConsultantId((current) => {
          if (current && data.consultants.some((consultant) => consultant.id === current)) {
            return current;
          }

          return data.consultants[0]?.id ?? "";
        });
        setSelectedScriptCourseId((current) => {
          if (current && data.courses.some((course) => course.id === current)) {
            return current;
          }

          return data.courses[0]?.id ?? "";
        });
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar IA comercial.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [canUseUnitFilter, canViewLeadershipArea, session, unitFilter],
  );

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    void loadEvolutionState();
  }, [loadEvolutionState, session?.activeUnit?.id, session?.user.id]);

  React.useEffect(() => {
    const interval = window.setInterval(
      () => void loadEvolutionState(true),
      evolutionState?.instance?.status === "connecting" || qrOpen ? 2_500 : 12_000,
    );

    return () => window.clearInterval(interval);
  }, [evolutionState?.instance?.status, loadEvolutionState, qrOpen]);

  React.useEffect(() => {
    setSelectedConsultantId("");
    setAnalysisCourseId("");
    setSelectedScriptCourseId("");
    setScriptForm(emptyScriptForm);
  }, [unitFilter]);

  React.useEffect(() => {
    if (!selectedConsultant) {
      setAnalysisCourseId("");
      return;
    }

    setAnalysisCourseId((current) => {
      if (current && availableScriptsForConsultant.some((script) => script.courseId === current)) {
        return current;
      }

      return firstScriptCourseForConsultant(selectedConsultant, scripts);
    });
  }, [availableScriptsForConsultant, scripts, selectedConsultant]);

  React.useEffect(() => {
    if (!selectedScriptCourseId) {
      setScriptForm(emptyScriptForm);
      return;
    }

    const script = findScriptForCourse(scripts, selectedScriptCourseId);
    const course = courses.find((item) => item.id === selectedScriptCourseId);

    setScriptForm({
      courseId: selectedScriptCourseId,
      title: script?.title ?? (course ? `Script de vendas - ${course.name}` : ""),
      scriptBody: script?.scriptBody ?? "",
      active: script?.active ?? true,
    });
  }, [courses, scripts, selectedScriptCourseId]);

  if (session && !canAccess) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <BrainCircuit className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A análise de conversas está disponível para liderança comercial.
          </p>
        </div>
      </div>
    );
  }

  async function handleAnalyze() {
    if (!selectedConsultant || !analysisCourseId) {
      toast.error("Selecione um consultor e um script de curso.");
      return;
    }

    setAnalyzing(true);

    try {
      const data = await requestJson<{ ok: true; analysis: SalesConversationAnalysis }>(
        await fetch("/api/ia-comercial/analises", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId: selectedConsultant.unitId,
            consultantId: selectedConsultant.id,
            courseId: analysisCourseId,
          }),
        }),
      );

      setConsultants((current) =>
        current.map((consultant) =>
          consultant.id === selectedConsultant.id
            ? { ...consultant, latestAnalysis: data.analysis }
            : consultant,
        ),
      );
      toast.success("Análise criada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao analisar conversas.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConnectWhatsapp() {
    setWorkingEvolution(true);

    try {
      const data = await requestJson<{ ok: true; status: ConnectionStatus; qrCode: string | null }>(
        "/api/integrations/evolution",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "connect" }),
        },
      );

      if (data.status === "connected") {
        setQrCode(null);
        setQrOpen(false);
        toast.success("WhatsApp conectado.");
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrOpen(true);
      } else {
        toast.info("A conexão está sendo preparada. Atualize o QR Code em alguns segundos.");
      }

      await loadEvolutionState(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao conectar WhatsApp.");
    } finally {
      setWorkingEvolution(false);
    }
  }

  async function handleDisconnectWhatsapp() {
    if (!window.confirm("Desconectar seu WhatsApp da IA Comercial?")) {
      return;
    }

    setWorkingEvolution(true);

    try {
      await requestJson("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setQrCode(null);
      setQrOpen(false);
      await loadEvolutionState(true);
      await loadData(true);
      toast.success("WhatsApp desconectado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao desconectar WhatsApp.");
    } finally {
      setWorkingEvolution(false);
    }
  }

  async function handleScriptSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const course = courses.find((item) => item.id === scriptForm.courseId);

    if (!course) {
      toast.error("Selecione um curso.");
      return;
    }

    setSavingScript(true);

    try {
      const data = await requestJson<{ ok: true; script: SalesScriptRecord }>(
        await fetch("/api/ia-comercial/scripts", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId: course.unitId,
            courseId: course.id,
            title: scriptForm.title,
            scriptBody: scriptForm.scriptBody,
            active: scriptForm.active,
          }),
        }),
      );

      setScripts((current) => {
        const withoutCurrent = current.filter((script) => script.courseId !== data.script.courseId);
        return [...withoutCurrent, data.script].sort((first, second) =>
          first.courseName.localeCompare(second.courseName),
        );
      });
      toast.success("Script salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar script.");
    } finally {
      setSavingScript(false);
    }
  }

  if (consultantView) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="IA Comercial"
          title="Sua IA de vendas"
          description="Conecte seu WhatsApp profissional para ativar o acompanhamento inteligente dos seus atendimentos."
        />

        <ConsultantWhatsappConnection
          state={evolutionState}
          loading={loadingEvolution}
          working={workingEvolution}
          firstName={session?.user.name.split(/\s+/)[0] || "Consultor"}
          unitName={session?.activeUnit?.name ?? "Unidade ativa"}
          onConnect={() => void handleConnectWhatsapp()}
          onDisconnect={() => void handleDisconnectWhatsapp()}
          onRefresh={() => void loadEvolutionState()}
        />

        <Dialog open={qrOpen && evolutionState?.instance?.status !== "connected"} onOpenChange={setQrOpen}>
          <DialogContent className="overflow-hidden p-0 sm:max-w-md">
            <div className="bg-[#071a42] px-6 py-5 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <QrCode className="h-5 w-5 text-[#f97316]" />
                  Conectar WhatsApp
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  No celular, abra WhatsApp, acesse Aparelhos conectados e leia o código abaixo.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex flex-col items-center px-6 pb-6 pt-5">
              {qrCode ? (
                <div className="rounded-2xl border border-[#f97316]/20 bg-white p-3 shadow-[0_22px_55px_-30px_rgba(7,26,66,0.65)]">
                  <img
                    src={qrCode}
                    alt="QR Code para conectar o WhatsApp"
                    className="aspect-square w-64 max-w-full"
                  />
                </div>
              ) : (
                <div className="flex aspect-square w-64 max-w-full items-center justify-center rounded-2xl border bg-muted/50">
                  <LoaderCircle className="h-7 w-7 animate-spin text-[#f97316]" />
                </div>
              )}
              <p className="mt-4 max-w-xs text-center text-xs leading-5 text-muted-foreground">
                Esta janela fechará automaticamente assim que a Evolution confirmar a conexão.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => void handleConnectWhatsapp()}
                disabled={workingEvolution}
              >
                <RefreshCw className={cn("h-4 w-4", workingEvolution && "animate-spin")} />
                Gerar novo QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title="IA Comercial"
        description="Análise de conversas dos consultores com base nos scripts de venda cadastrados por curso."
        actions={
          <>
            {canUseUnitFilter ? (
              <div className="w-full sm:w-64">
                <Label className="sr-only">Unidade</Label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger>
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ATTENDANCE_ALL_UNITS}>Todas as unidades</SelectItem>
                    {session?.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {session?.activeUnit?.name ?? "Unidade ativa"}
              </Badge>
            )}
            <Button type="button" variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          </>
        }
      />

      <WhatsappConnectionCard
        state={evolutionState}
        loading={loadingEvolution}
        working={workingEvolution}
        unitName={session?.activeUnit?.name ?? "Unidade ativa"}
        onConnect={() => void handleConnectWhatsapp()}
        onDisconnect={() => void handleDisconnectWhatsapp()}
        onRefresh={() => void loadEvolutionState()}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UserCheck} label="Consultores" value={consultants.length} />
        <MetricCard icon={MessageSquareText} label="Mensagens 30d" value={messages30d} />
        <MetricCard icon={ScrollText} label="Scripts ativos" value={scriptedCourses.size} />
        <MetricCard icon={Target} label="Nota média IA" value={analyzedCount ? averageScore : "--"} />
      </div>

      <Tabs defaultValue="analises" className="space-y-4">
        <TabsList className="bg-primary/10 text-primary">
          <TabsTrigger value="analises" className="gap-2">
            <BrainCircuit className="h-4 w-4" />
            Análises
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="h-4 w-4" />
            Scripts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analises" className="space-y-4">
          <div className="grid min-h-[680px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ConsultantList
              consultants={consultants}
              loading={loading}
              selectedId={selectedConsultantId}
              onSelect={setSelectedConsultantId}
            />
            <AnalysisWorkspace
              consultant={selectedConsultant}
              analysis={selectedAnalysis}
              scripts={availableScriptsForConsultant}
              courseId={analysisCourseId}
              analyzing={analyzing}
              onCourseChange={setAnalysisCourseId}
              onAnalyze={() => void handleAnalyze()}
            />
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <CourseScriptList
              courses={courses}
              scripts={scripts}
              loading={loading}
              selectedCourseId={selectedScriptCourseId}
              onSelect={setSelectedScriptCourseId}
            />
            <ScriptEditor
              course={selectedCourse}
              form={scriptForm}
              saving={savingScript}
              onFormChange={setScriptForm}
              onSubmit={handleScriptSubmit}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Leia o QR Code com o WhatsApp do celular para liberar a análise das conversas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrCode ? (
              <img
                src={qrCode}
                alt="QR Code para conectar WhatsApp"
                className="h-64 w-64 rounded-md border bg-white p-2"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-md border bg-muted">
                <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleConnectWhatsapp()}
              disabled={workingEvolution}
            >
              <RefreshCw className={cn("h-4 w-4", workingEvolution && "animate-spin")} />
              Atualizar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsultantWhatsappConnection({
  state,
  loading,
  working,
  firstName,
  unitName,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  state: EvolutionState | null;
  loading: boolean;
  working: boolean;
  firstName: string;
  unitName: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const connected = state?.instance?.status === "connected";
  const connecting = state?.instance?.status === "connecting";
  const status = whatsappStatusInfo(state?.instance?.status);
  const StatusIcon = status.icon;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#071a42]/10 bg-[#071a42] text-white shadow-[0_28px_80px_-42px_rgba(7,26,66,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(249,115,22,0.35),transparent_28%),radial-gradient(circle_at_10%_100%,rgba(255,255,255,0.10),transparent_35%)]" />
      <div className="relative grid min-h-[560px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between gap-10 p-7 sm:p-10 lg:p-14">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                {unitName}
              </Badge>
              <Badge variant="outline" className={status.className}>
                <StatusIcon className={cn("mr-1.5 h-3.5 w-3.5", connecting && "animate-pulse")} />
                {loading ? "Verificando status..." : status.label}
              </Badge>
            </div>

            <p className="mt-10 text-xs font-bold uppercase tracking-[0.28em] text-[#fb923c]">
              Master IA
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              {connected
                ? `${firstName}, sua IA está ativa.`
                : `${firstName}, conecte seu WhatsApp para começar.`}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
              {connected
                ? "A conexão está funcionando e suas conversas comerciais já podem ser acompanhadas pela IA. Você pode continuar atendendo normalmente pelo WhatsApp."
                : "A conexão é individual e segura. Gere o QR Code, leia com o WhatsApp usado nos atendimentos e aguarde a confirmação automática."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {connected ? (
              <>
                <Button
                  type="button"
                  className="bg-white text-[#071a42] hover:bg-white/90"
                  onClick={onRefresh}
                  disabled={loading || working}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Verificar conexão
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={onDisconnect}
                  disabled={working}
                >
                  {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                  Desconectar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="h-11 bg-[#f97316] px-6 font-bold text-white hover:bg-[#ea580c]"
                onClick={onConnect}
                disabled={working || loading || !state?.configured}
              >
                {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {connecting ? "Exibir QR Code" : "Gerar QR Code"}
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-center border-t border-white/10 bg-white/[0.045] p-7 lg:border-l lg:border-t-0 lg:p-12">
          <div className="w-full max-w-sm rounded-[24px] border border-white/14 bg-white p-6 text-[#071a42] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.7)] sm:p-8">
            {loading ? (
              <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-[#f97316]" />
              </div>
            ) : connected ? (
              <div className="flex min-h-72 flex-col justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Status conectado
                </p>
                <h3 className="mt-2 text-2xl font-black">Tudo pronto para vender.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Seu WhatsApp está vinculado ao seu usuário nesta unidade.
                </p>
                {state?.instance?.phoneNumber ? (
                  <div className="mt-6 rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-bold text-[#c2410c]">
                    {formatPhone(state.instance.phoneNumber)}
                  </div>
                ) : null}
                <p className="mt-4 text-xs text-slate-400">
                  Conectado em {formatDate(state?.instance?.connectedAt ?? null)}
                </p>
              </div>
            ) : (
              <div className="flex min-h-72 flex-col justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316]">
                  <QrCode className="h-8 w-8" />
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#f97316]">
                  Status desconectado
                </p>
                <h3 className="mt-2 text-2xl font-black">A IA ainda está em pausa.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Gere o QR Code para ativar o acompanhamento das suas conversas comerciais.
                </p>
                {!state?.configured ? (
                  <div className="mt-6 flex gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium leading-5 text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    A Evolution API ainda não está disponível. Avise o administrador.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsappConnectionCard({
  state,
  loading,
  working,
  unitName,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  state: EvolutionState | null;
  loading: boolean;
  working: boolean;
  unitName: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const connected = state?.instance?.status === "connected";
  const status = whatsappStatusInfo(state?.instance?.status);
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden border-primary/15 bg-[linear-gradient(135deg,rgba(249,115,22,.08),rgba(255,255,255,.92),rgba(18,54,201,.06))] shadow-card">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={status.className}>
              <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
              {loading ? "Verificando conexão..." : status.label}
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {unitName}
            </Badge>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-normal text-foreground">
            WhatsApp da IA Comercial
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Conecte o WhatsApp desta unidade para a IA Comercial ler as mensagens via webhook da Evolution e gerar análises individuais.
          </p>
          {state?.instance ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Instância: <span className="font-semibold text-foreground">{state.instance.name}</span>
              {state.instance.phoneNumber ? (
                <>
                  {" · "}
                  <span className="font-semibold text-primary">
                    {formatPhone(state.instance.phoneNumber)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          {!state?.configured && !loading ? (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-destructive">
              <CircleAlert className="h-3.5 w-3.5" />
              Evolution API ainda não está configurada no servidor.
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading || working}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
          {connected ? (
            <Button type="button" variant="outline" onClick={onDisconnect} disabled={working}>
              {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Desconectar
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-gradient-primary text-primary-foreground"
              onClick={onConnect}
              disabled={working || !state?.configured}
            >
              {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Conectar WhatsApp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold leading-none">{value}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConsultantList({
  consultants,
  loading,
  selectedId,
  onSelect,
}: {
  consultants: Array<SalesAiConsultantSummary>;
  loading: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardHeader className="border-b border-border/70 bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-primary" />
          Consultores
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[616px] overflow-y-auto p-2">
        {loading ? (
          <LoadingBlock label="Carregando consultores..." />
        ) : consultants.length ? (
          <div className="space-y-2">
            {consultants.map((consultant) => {
              const selected = consultant.id === selectedId;
              const StatusIcon = statusIcon(consultant.status);

              return (
                <button
                  key={`${consultant.unitId}-${consultant.id}`}
                  type="button"
                  onClick={() => onSelect(consultant.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5",
                    selected
                      ? "border-primary/40 bg-primary/10 shadow-[0_18px_42px_-28px_rgba(249,115,22,0.9)]"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 border border-primary/10">
                      <AvatarImage
                        src={consultant.avatarUrl ?? undefined}
                        alt={consultant.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {getInitials(consultant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{consultant.name}</p>
                        <StatusIcon
                          className={cn(
                            "h-3.5 w-3.5",
                            consultant.status === "connected"
                              ? "text-success"
                              : "text-muted-foreground",
                          )}
                        />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {consultant.unitName}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {consultant.messageCount30d} mensagens
                        </span>
                        {consultant.latestAnalysis ? (
                          <Badge variant="outline" className={scoreBadge(consultant.latestAnalysis.score)}>
                            {Math.round(consultant.latestAnalysis.score)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem análise</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyPanel
            icon={UserCheck}
            title="Nenhum consultor conectado"
            description="Os consultores aparecem quando conectam o WhatsApp em Conversas IA."
          />
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisWorkspace({
  consultant,
  analysis,
  scripts,
  courseId,
  analyzing,
  onCourseChange,
  onAnalyze,
}: {
  consultant: SalesAiConsultantSummary | null;
  analysis: SalesConversationAnalysis | null;
  scripts: Array<SalesScriptRecord>;
  courseId: string;
  analyzing: boolean;
  onCourseChange: (courseId: string) => void;
  onAnalyze: () => void;
}) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-card to-card">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-primary" />
              Diagnóstico da IA
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {consultant ? `${consultant.name} · ${statusLabel(consultant.status)}` : "Selecione um consultor"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={courseId} onValueChange={onCourseChange} disabled={!consultant || !scripts.length}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Script de curso" />
              </SelectTrigger>
              <SelectContent>
                {scripts.map((script) => (
                  <SelectItem key={script.courseId} value={script.courseId}>
                    {script.courseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={onAnalyze}
              disabled={!consultant || !courseId || analyzing}
              className="gap-2 bg-gradient-primary"
            >
              {analyzing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? "Analisando..." : "Analisar conversas"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {!consultant ? (
          <EmptyPanel
            icon={BrainCircuit}
            title="Escolha um consultor"
            description="A análise aparece quando um consultor é selecionado."
            className="min-h-[480px]"
          />
        ) : !scripts.length ? (
          <EmptyPanel
            icon={ScrollText}
            title="Nenhum script ativo para esta unidade"
            description="Cadastre o script de vendas do curso na aba Scripts."
            className="min-h-[480px]"
          />
        ) : analysis ? (
          <AnalysisDetail analysis={analysis} />
        ) : (
          <EmptyPanel
            icon={ClipboardCheck}
            title="Sem análise recente"
            description="Rode a análise para gerar recomendações com base no script escolhido."
            className="min-h-[480px]"
          />
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisDetail({ analysis }: { analysis: SalesConversationAnalysis }) {
  const scores = [
    { label: "Aderência ao script", value: analysis.scriptAdherence },
    { label: "Rapport", value: analysis.rapportScore },
    { label: "Diagnóstico", value: analysis.discoveryScore },
    { label: "Objeções", value: analysis.objectionScore },
    { label: "Fechamento", value: analysis.closingScore },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 text-center">
          <div className={cn("text-6xl font-black leading-none", scoreTone(analysis.score))}>
            {Math.round(analysis.score)}
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Nota geral
          </div>
          <Badge className="mt-4 bg-white text-primary" variant="secondary">
            {analysis.messagesAnalyzed} mensagens · {analysis.conversationsAnalyzed} conversas
          </Badge>
        </div>
        <div className="rounded-lg border border-border bg-background/65 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-gold/15 text-gold-foreground">
              {analysis.courseName}
            </Badge>
            <Badge variant="outline">{formatDate(analysis.createdAt)}</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-foreground">{analysis.summary}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {scores.map((score) => (
          <div key={score.label} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-muted-foreground">{score.label}</span>
              <span className="font-bold">{Math.round(score.value)}</span>
            </div>
            <Progress value={score.value} className="mt-3" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightList icon={CheckCircle2} title="Pontos fortes" items={analysis.strengths} />
        <InsightList icon={AlertTriangle} title="Melhorias" items={analysis.improvements} />
        <InsightList icon={Target} title="Plano de ação" items={analysis.actionItems} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Exemplos observados</h3>
        </div>
        <div className="divide-y divide-border">
          {analysis.examples.length ? (
            analysis.examples.map((example, index) => (
              <div key={`${example.conversation}-${index}`} className="grid gap-2 p-4 lg:grid-cols-[160px_minmax(0,1fr)]">
                <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                  {example.conversation || `Exemplo ${index + 1}`}
                </Badge>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{example.evidence}</p>
                  <p className="font-medium text-foreground">{example.recommendation}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Nenhum exemplo específico retornado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightList({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: Array<string>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {items.length ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="rounded-md bg-background/70 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sem itens nesta análise.</p>
      )}
    </div>
  );
}

function CourseScriptList({
  courses,
  scripts,
  loading,
  selectedCourseId,
  onSelect,
}: {
  courses: Array<SalesAiCourseOption>;
  scripts: Array<SalesScriptRecord>;
  loading: boolean;
  selectedCourseId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardHeader className="border-b border-border/70 bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          Cursos
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[650px] overflow-y-auto p-2">
        {loading ? (
          <LoadingBlock label="Carregando cursos..." />
        ) : courses.length ? (
          <div className="space-y-2">
            {courses.map((course) => {
              const selected = course.id === selectedCourseId;
              const script = findScriptForCourse(scripts, course.id);

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5",
                    selected ? "border-primary/40 bg-primary/10" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{course.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{course.unitName}</p>
                    </div>
                    {script?.active ? (
                      <Badge variant="outline" className="border-success/25 bg-success/10 text-success">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Sem script</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyPanel
            icon={GraduationCap}
            title="Nenhum curso encontrado"
            description="Cadastre cursos na área de Gestão para vincular scripts."
          />
        )}
      </CardContent>
    </Card>
  );
}

function ScriptEditor({
  course,
  form,
  saving,
  onFormChange,
  onSubmit,
}: {
  course: SalesAiCourseOption | null;
  form: ScriptForm;
  saving: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<ScriptForm>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardHeader className="border-b border-border/70 bg-gradient-to-r from-gold/15 via-card to-card">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-gold" />
          Script de vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {course ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {course.name}
              </Badge>
              <Badge variant="outline">{course.unitName}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-title">Título</Label>
              <Input
                id="script-title"
                value={form.title}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Script de venda consultiva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="script-body">Script</Label>
              <Textarea
                id="script-body"
                value={form.scriptBody}
                onChange={(event) =>
                  onFormChange((current) => ({ ...current, scriptBody: event.target.value }))
                }
                className="min-h-[420px] resize-y leading-6"
                placeholder="Cole aqui o roteiro completo de abordagem, diagnóstico, apresentação, objeções e fechamento."
                required
              />
              <div className="text-xs text-muted-foreground">{form.scriptBody.length} caracteres</div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/65 p-3">
              <div>
                <Label className="text-sm font-semibold">Script ativo</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Apenas scripts ativos entram na análise do consultor.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => onFormChange((current) => ({ ...current, active }))}
              />
            </div>

            <Button type="submit" className="w-full gap-2 bg-gradient-primary" disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar script"}
            </Button>
          </form>
        ) : (
          <EmptyPanel
            icon={ScrollText}
            title="Selecione um curso"
            description="O editor aparece quando um curso é selecionado."
            className="min-h-[520px]"
          />
        )}
      </CardContent>
    </Card>
  );
}

function LoadingBlock({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn("flex min-h-48 items-center justify-center text-muted-foreground", className)}
    >
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-56 items-center justify-center p-6 text-center", className)}>
      <div className="max-w-sm">
        <Icon className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
