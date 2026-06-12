import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  DollarSign,
  GraduationCap,
  LineChart,
  Phone,
  PieChart,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

type DashboardMetrics = {
  leadsReceived: number;
  qualifiedLeads: number;
  enrollments: number;
  conversionRate: number;
  followUpRate: number;
  averageTicket: number;
};

type DashboardResponse = {
  unit: {
    id: string;
    name: string;
    slug: string;
  };
  metrics: DashboardMetrics;
  sources: Array<{
    source: string;
    leads: number;
    enrollments: number;
  }>;
  funnel: Array<{
    stage: string;
    leads: number;
  }>;
  cities: Array<{
    city: string;
    leads: number;
    enrollments: number;
  }>;
};

const emptyMetrics: DashboardMetrics = {
  leadsReceived: 0,
  qualifiedLeads: 0,
  enrollments: 0,
  conversionRate: 0,
  followUpRate: 0,
  averageTicket: 0,
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Falha ao carregar dashboard.";
    throw new Error(message);
  }

  return data;
}

function unitQuery(unitId: string) {
  return `?unitId=${encodeURIComponent(unitId)}`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function metricValue(loading: boolean, value: string | number) {
  return loading ? "..." : value;
}

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard Executivo · Planarius Growth Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { session, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = React.useState<DashboardResponse | null>(null);
  const [loadingDashboard, setLoadingDashboard] = React.useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const userName = session?.user.name ?? "Plenarius";
  const activeUnitId = session?.activeUnit?.id ?? "";
  const activeUnitName = dashboard?.unit.name ?? session?.activeUnit?.name ?? "Unidade ativa";
  const isLoading = authLoading || loadingDashboard;
  const metrics = dashboard?.metrics ?? emptyMetrics;
  const sourceTotal = dashboard?.sources.reduce((total, item) => total + item.leads, 0) ?? 0;
  const funnelTotal = dashboard?.funnel.reduce((total, item) => total + item.leads, 0) ?? 0;
  const cityTotal = dashboard?.cities.reduce((total, item) => total + item.leads, 0) ?? 0;
  const insights = buildInsights(metrics);

  React.useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!activeUnitId) {
      setDashboard(null);
      return;
    }

    let ignore = false;

    async function loadDashboard() {
      setLoadingDashboard(true);

      try {
        const data = await readJson<DashboardResponse>(
          await fetch(`/api/dashboard${unitQuery(activeUnitId)}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          }),
        );

        if (!ignore) {
          setDashboard(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar dashboard.");
        }
      } finally {
        if (!ignore) {
          setLoadingDashboard(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [activeUnitId, authLoading]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3 w-3" /> Visão executiva
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              {greeting}, {userName}. Dashboard conectado à operação.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Indicadores calculados em tempo real a partir dos leads, alunos e funil comercial da
              unidade {activeUnitName}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to="/crm">Abrir CRM</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label="Leads recebidos"
          value={metricValue(isLoading, metrics.leadsReceived)}
          icon={Users}
          accent="primary"
          hint={activeUnitName}
        />
        <StatCard
          label="Qualificados"
          value={metricValue(isLoading, metrics.qualifiedLeads)}
          icon={UserCheck}
          accent="primary"
          hint="Funil avançado"
        />
        <StatCard
          label="Matrículas"
          value={metricValue(isLoading, metrics.enrollments)}
          icon={GraduationCap}
          accent="gold"
          hint="Taxa feita"
        />
        <StatCard
          label="Conversão"
          value={metricValue(isLoading, formatPercent(metrics.conversionRate))}
          icon={LineChart}
          accent="success"
          hint="Matrículas/leads"
        />
        <StatCard
          label="Follow-up"
          value={metricValue(isLoading, formatPercent(metrics.followUpRate))}
          icon={Phone}
          accent="primary"
          hint="Leads acionados"
        />
        <StatCard
          label="Ticket médio"
          value={metricValue(isLoading, formatCurrency(metrics.averageTicket))}
          icon={DollarSign}
          accent="primary"
          hint="Alunos"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Origem dos leads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PanelLoading />
            ) : dashboard?.sources.length ? (
              <div className="space-y-4">
                {dashboard.sources.map((item) => (
                  <DataBar
                    key={item.source}
                    label={item.source}
                    value={item.leads}
                    max={sourceTotal}
                    detail={`${item.enrollments} matrículas`}
                    accent="primary"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={PieChart}
                title="Sem origens capturadas"
                description="As fontes de aquisição serão exibidas depois que os leads entrarem no sistema."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Funil comercial</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PanelLoading />
            ) : dashboard?.funnel.some((item) => item.leads > 0) ? (
              <div className="grid gap-3 md:grid-cols-2">
                {dashboard.funnel.map((item) => (
                  <DataBar
                    key={item.stage}
                    label={item.stage}
                    value={item.leads}
                    max={funnelTotal}
                    detail={`${formatPercent((item.leads / Math.max(funnelTotal, 1)) * 100)} do total`}
                    accent={item.stage === "Matriculado" ? "gold" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Sem movimentação no funil"
                description="Os estágios do funil serão alimentados quando existirem leads reais no CRM."
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Performance por cidade</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PanelLoading />
            ) : dashboard?.cities.length ? (
              <div className="space-y-4">
                {dashboard.cities.map((item) => (
                  <DataBar
                    key={item.city}
                    label={item.city}
                    value={item.leads}
                    max={cityTotal}
                    detail={`${item.enrollments} matrículas`}
                    accent="success"
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Sem dados por cidade"
                description="A distribuição geográfica será calculada quando os leads tiverem cidade cadastrada."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold">
              <Sparkles className="h-4 w-4 text-gold-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Insights da IA</CardTitle>
              <p className="text-xs text-muted-foreground">
                Recomendações priorizadas para sua escola
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PanelLoading />
          ) : insights.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {insights.map((insight) => (
                <div
                  key={insight.title}
                  className="rounded-lg border border-primary/10 bg-primary/5 p-4"
                >
                  <div className="text-sm font-semibold text-primary">{insight.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Sem insights gerados"
              description="A IA começará a sugerir ações quando houver dados comerciais suficientes."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DataBar({
  label,
  value,
  max,
  detail,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
  accent: "primary" | "gold" | "success";
}) {
  const width = max > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
  const fillClass = {
    primary: "bg-primary",
    gold: "bg-gold",
    success: "bg-success",
  }[accent];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-muted-foreground">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-2 animate-pulse rounded bg-muted" />
    </div>
  );
}

function buildInsights(metrics: DashboardMetrics) {
  const insights: Array<{ title: string; detail: string }> = [];

  if (metrics.leadsReceived > 0 && metrics.followUpRate < 70) {
    insights.push({
      title: "Follow-up precisa de atenção",
      detail: `${formatPercent(metrics.followUpRate)} dos leads já tiveram avanço ou contato registrado.`,
    });
  }

  if (metrics.leadsReceived > 0 && metrics.conversionRate < 15) {
    insights.push({
      title: "Conversão abaixo do alvo",
      detail: `${formatPercent(metrics.conversionRate)} dos leads viraram alunos até agora.`,
    });
  }

  return insights.slice(0, 3);
}
