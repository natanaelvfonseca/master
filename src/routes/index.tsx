import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DollarSign,
  Flame,
  GraduationCap,
  LineChart as LineChartIcon,
  Phone,
  ReceiptText,
  Target,
  UserCheck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  formatCurrency,
  formatPercent,
  GrowthDataBar,
  GrowthEmptyPanel,
  GrowthLoading,
  metricValue,
} from "@/components/growth/GrowthDashboardPrimitives";
import { useAuth } from "@/lib/auth";
import { canViewNetworkGrowth, isDevRole } from "@/lib/auth-types";
import type { AuthSession } from "@/lib/auth-types";
import type { GrowthMetrics, GrowthResponse } from "@/lib/growth-types";
import { useGrowthData } from "@/lib/use-growth-data";
import { cn } from "@/lib/utils";

const emptyMetrics: GrowthMetrics = {
  leadsReceived: 0,
  newLeads: 0,
  qualifiedLeads: 0,
  enrollments: 0,
  proposals: 0,
  pendingPayments: 0,
  uncontactedLeads: 0,
  overdueFollowUps: 0,
  todayFollowUps: 0,
  conversionRate: 0,
  followUpRate: 0,
  averageTicket: 0,
  leadsWithSource: 0,
  sourceConversionRate: 0,
  activeChannels: 0,
  paidChannels: 0,
  revenue: 0,
  confirmedRevenue: 0,
  pipelinePotential: 0,
  proposalPotential: 0,
  pendingPaymentPotential: 0,
  leadsWithoutCourseValue: 0,
  metaLeads: 0,
  campaignCount: 0,
  averageFirstContactHours: 0,
};

const toneClasses = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  gold: "border-gold/20 bg-gold/10 text-gold",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
} as const;

function formatDay(value: string) {
  const [, month, day] = value.split("-");
  return day && month ? `${day}/${month}` : value;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard Inicial · Master Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { session, loading: authLoading, setActiveUnit } = useAuth();
  const canViewNetwork = session ? canViewNetworkGrowth(session.user.role) : false;
  const isDev = session ? isDevRole(session.user.role) : false;
  const scopeValue = isDev
    ? (session?.activeUnit?.id ?? "")
    : canViewNetwork
      ? "all"
      : (session?.activeUnit?.id ?? "");
  const { data, loading } = useGrowthData(scopeValue, Boolean(session && scopeValue), 30);
  const metrics = data?.metrics ?? emptyMetrics;
  const isLoading = authLoading || loading;
  const funnelData = data?.funnel.filter((item) => item.leads > 0) ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const [switchingUnit, setSwitchingUnit] = React.useState(false);

  async function handleUnitChange(unitId: string) {
    if (!unitId || unitId === session?.activeUnit?.id) {
      return;
    }

    setSwitchingUnit(true);

    try {
      await setActiveUnit(unitId);
    } finally {
      setSwitchingUnit(false);
    }
  }

  return (
    <div className="space-y-5">
      <DashboardHero
        greeting={greeting}
        name={session?.user.name ?? "Master"}
        session={session}
        switchingUnit={switchingUnit}
        onUnitChange={(unitId) => void handleUnitChange(unitId)}
      />

      <DashboardOverview data={data} metrics={metrics} isLoading={isLoading} funnelData={funnelData} />
    </div>
  );
}

function DashboardHero({
  greeting,
  name,
  session,
  switchingUnit,
  onUnitChange,
}: {
  greeting: string;
  name: string;
  session: AuthSession | null;
  switchingUnit: boolean;
  onUnitChange: (unitId: string) => void;
}) {
  const showUnitSwitcher = session ? isDevRole(session.user.role) && session.units.length > 1 : false;

  return (
    <section className="px-1 py-2">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-normal text-foreground md:text-3xl">
            {greeting}, {name}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Visão geral da Master Educação Profissional
          </p>
        </div>
        {showUnitSwitcher ? (
          <div className="w-full md:w-[260px]">
            <Select
              value={session.activeUnit?.id ?? ""}
              onValueChange={onUnitChange}
              disabled={switchingUnit}
            >
              <SelectTrigger className="h-10 w-full border-primary/20 bg-white shadow-sm">
                <SelectValue placeholder="Trocar unidade" />
              </SelectTrigger>
              <SelectContent>
                {session.units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DashboardOverview({
  data,
  metrics,
  isLoading,
  funnelData,
}: {
  data: GrowthResponse | null;
  metrics: GrowthMetrics;
  isLoading: boolean;
  funnelData: GrowthResponse["funnel"];
}) {
  const kpis = [
    {
      label: "Leads",
      value: metricValue(isLoading, metrics.leadsReceived),
      hint: `${metricValue(isLoading, metrics.newLeads)} novos no período`,
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Matrículas",
      value: metricValue(isLoading, metrics.enrollments),
      hint: `${metricValue(isLoading, formatPercent(metrics.conversionRate))} de conversão`,
      icon: GraduationCap,
      tone: "success" as const,
    },
    {
      label: "Follow-up",
      value: metricValue(isLoading, metrics.todayFollowUps + metrics.overdueFollowUps),
      hint: `${metricValue(isLoading, metrics.overdueFollowUps)} vencidos`,
      icon: CalendarClock,
      tone: "gold" as const,
    },
  ];

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        {kpis.map((item) => (
          <KpiTile key={item.label} {...item} />
        ))}
      </div>

      <FunnelPanel funnelData={funnelData} isLoading={isLoading} title="Pipeline" />

      <div className="grid gap-4 xl:grid-cols-2">
        <ConsultantPerformanceTable data={data} isLoading={isLoading} />
        <CoursePanel data={data} isLoading={isLoading} />
      </div>

      <CampaignEfficiencyPanel data={data} isLoading={isLoading} />
    </>
  );
}

function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone: keyof typeof toneClasses;
}) {
  return (
    <div className="group relative min-h-[136px] overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-3 break-words text-2xl font-extrabold tracking-normal text-foreground">
            {value}
          </div>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{hint}</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-gold to-success opacity-0 transition-opacity group-hover:opacity-70" />
    </div>
  );
}

function LeadRhythmChart({ data, isLoading }: { data: GrowthResponse | null; isLoading: boolean }) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Ritmo de entrada e matrículas
        </CardTitle>
        <CardDescription>Leads recebidos e matrículas no período selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : data?.trend.length ? (
          <div className="h-[276px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="dashboardLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D5E1F6" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDay}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip labelFormatter={(value) => formatDay(String(value))} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#F97316"
                  fill="url(#dashboardLeads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  name="Matrículas"
                  stroke="#1236C9"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <GrowthEmptyPanel
            icon={Activity}
            title="Sem movimento no período"
            description="Os dados aparecem conforme novos leads entram no CRM."
          />
        )}
      </CardContent>
    </Card>
  );
}

function FunnelPanel({
  funnelData,
  isLoading,
  title,
}: {
  funnelData: GrowthResponse["funnel"];
  isLoading: boolean;
  title: string;
}) {
  const maxLeads = Math.max(...funnelData.map((item) => item.leads), 0);

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>Concentração atual dos leads por etapa.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : funnelData.length ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="#D5E1F6" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={136}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill="#FF8A1F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.stage} className="rounded-lg border border-border bg-background/65 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{stage.stage}</span>
                    <span className="text-lg font-extrabold text-foreground">{stage.leads}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${maxLeads > 0 ? Math.max(6, Math.round((stage.leads / maxLeads) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <GrowthEmptyPanel
            icon={Activity}
            title="Funil vazio"
            description="Sem leads no período selecionado."
          />
        )}
      </CardContent>
    </Card>
  );
}

function ConsultantPriorityPanel({
  metrics,
  isLoading,
}: {
  metrics: GrowthMetrics;
  isLoading: boolean;
}) {
  const items = [
    {
      label: "Follow-ups vencidos",
      value: metricValue(isLoading, metrics.overdueFollowUps),
      detail: "Entrar em contato antes de perder ritmo",
      icon: AlertTriangle,
      tone: metrics.overdueFollowUps > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Sem primeiro contato",
      value: metricValue(isLoading, metrics.uncontactedLeads),
      detail: "Leads novos aguardando abordagem",
      icon: Phone,
      tone: metrics.uncontactedLeads > 0 ? ("warning" as const) : ("primary" as const),
    },
    {
      label: "Propostas abertas",
      value: metricValue(isLoading, metrics.proposals),
      detail: "Oportunidades em negociação",
      icon: Flame,
      tone: "gold" as const,
    },
    {
      label: "Pagamentos pendentes",
      value: metricValue(isLoading, metrics.pendingPayments),
      detail: "Taxas que precisam de fechamento",
      icon: ReceiptText,
      tone: metrics.pendingPayments > 0 ? ("warning" as const) : ("primary" as const),
    },
  ];

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Prioridades de hoje
        </CardTitle>
        <CardDescription>Fila individual para proteger conversas e taxas próximas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ActionRow key={item.label} {...item} />
        ))}
        <Button asChild className="mt-2 w-full gap-2 bg-gradient-primary">
          <Link to="/crm">
            Trabalhar carteira
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConsultantMoneyPanel({
  metrics,
  isLoading,
}: {
  metrics: GrowthMetrics;
  isLoading: boolean;
}) {
  const rows = [
    {
      label: "Potencial em aberto",
      value: metricValue(isLoading, formatCurrency(metrics.pipelinePotential)),
      icon: WalletCards,
      tone: "gold" as const,
    },
    {
      label: "Proposta + confirmado",
      value: metricValue(isLoading, formatCurrency(metrics.proposalPotential)),
      icon: Flame,
      tone: "warning" as const,
    },
    {
      label: "Parado em pagamento",
      value: metricValue(isLoading, formatCurrency(metrics.pendingPaymentPotential)),
      icon: ReceiptText,
      tone: "danger" as const,
    },
    {
      label: "Leads sem valor de curso",
      value: metricValue(isLoading, metrics.leadsWithoutCourseValue),
      icon: AlertTriangle,
      tone: metrics.leadsWithoutCourseValue > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-gold" />
          Minha leitura financeira
        </CardTitle>
        <CardDescription>Valores baseados na taxa do curso vinculada ao lead.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((item) => (
          <ActionRow
            key={item.label}
            label={item.label}
            value={item.value}
            detail="Período atual"
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: keyof typeof toneClasses;
}) {
  return (
    <div className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background/65 p-3">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className="text-right text-lg font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function ExecutivePulsePanel({
  metrics,
  isLoading,
}: {
  metrics: GrowthMetrics;
  isLoading: boolean;
}) {
  const items = [
    {
      label: "Leads novos",
      value: metricValue(isLoading, metrics.newLeads),
      detail: "Entrada bruta no período",
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Follow-ups para hoje",
      value: metricValue(isLoading, metrics.todayFollowUps),
      detail: "Tarefas pendentes com vencimento hoje",
      icon: CalendarClock,
      tone: "gold" as const,
    },
    {
      label: "Leads sem valor",
      value: metricValue(isLoading, metrics.leadsWithoutCourseValue),
      detail: "Não entram na soma financeira",
      icon: AlertTriangle,
      tone: metrics.leadsWithoutCourseValue > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="h-4 w-4 text-primary" />
          Pulso operacional
        </CardTitle>
        <CardDescription>Riscos rápidos que afetam receita e velocidade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ActionRow key={item.label} {...item} />
        ))}
      </CardContent>
    </Card>
  );
}

function ConsultantPerformanceTable({
  data,
  isLoading,
}: {
  data: GrowthResponse | null;
  isLoading: boolean;
}) {
  const consultants =
    data?.consultants
      .filter(
        (consultant) =>
          consultant.leads > 0 ||
          consultant.pipelinePotential > 0 ||
          consultant.confirmedRevenue > 0,
      )
      .slice(0, 8) ?? [];
  const maxPotential = Math.max(...consultants.map((item) => item.pipelinePotential), 0);

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Performance por consultor
        </CardTitle>
        <CardDescription>Carteira, conversão, potencial e valor confirmado.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : consultants.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultor</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Matrículas</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead className="text-right">Potencial</TableHead>
                <TableHead className="text-right">Confirmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants.map((consultant) => (
                <TableRow key={consultant.id}>
                  <TableCell className="font-semibold">{consultant.name}</TableCell>
                  <TableCell className="text-right">{consultant.leads}</TableCell>
                  <TableCell className="text-right">{consultant.enrollments}</TableCell>
                  <TableCell className="min-w-[132px]">
                    <div className="flex items-center gap-2">
                      <Progress value={clampPercent(consultant.conversionRate)} />
                      <span className="w-12 text-right text-xs text-muted-foreground">
                        {formatPercent(consultant.conversionRate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">{formatCurrency(consultant.pipelinePotential)}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{
                          width: `${maxPotential > 0 ? Math.max(6, Math.round((consultant.pipelinePotential / maxPotential) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {formatCurrency(consultant.confirmedRevenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <GrowthEmptyPanel
            icon={UserCheck}
            title="Sem consultores com movimento"
            description="A performance aparece quando houver leads vinculados aos consultores."
          />
        )}
      </CardContent>
    </Card>
  );
}

function SourcePanel({
  data,
  isLoading,
  sourceMax,
}: {
  data: GrowthResponse | null;
  isLoading: boolean;
  sourceMax: number;
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-gold" />
          Origens com valor
        </CardTitle>
        <CardDescription>Volume, matrículas e potencial por canal de entrada.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : data?.sources.length ? (
          <div className="grid gap-4">
            {data.sources.slice(0, 6).map((source) => (
              <GrowthDataBar
                key={source.source}
                label={source.source}
                value={source.leads}
                max={sourceMax}
                detail={`${source.enrollments} matrículas · ${formatCurrency(source.pipelinePotential)} em aberto`}
                accent={source.enrollments ? "success" : "primary"}
              />
            ))}
          </div>
        ) : (
          <GrowthEmptyPanel
            icon={Users}
            title="Sem origens capturadas"
            description="As origens aparecem quando os leads chegam com canal identificado."
          />
        )}
      </CardContent>
    </Card>
  );
}

function CoursePanel({ data, isLoading }: { data: GrowthResponse | null; isLoading: boolean }) {
  const courses = data?.courses.slice(0, 6) ?? [];
  const maxPotential = Math.max(...courses.map((course) => course.pipelinePotential), 0);

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-primary" />
          Performance por curso
        </CardTitle>
        <CardDescription>Onde o dinheiro está aberto e onde já virou matrícula.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : courses.length ? (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.course}
                className="rounded-lg border border-border bg-background/65 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{course.course}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {course.leads} leads · {course.enrollments} matrículas ·{" "}
                      {formatPercent(course.conversionRate)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-foreground">
                      {formatCurrency(course.pipelinePotential)}
                    </div>
                    <div className="text-xs text-success">
                      {formatCurrency(course.confirmedRevenue)} confirmado
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${maxPotential > 0 ? Math.max(5, Math.round((course.pipelinePotential / maxPotential) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <GrowthEmptyPanel
            icon={GraduationCap}
            title="Sem cursos vinculados"
            description="Os valores aparecem quando os leads possuem curso e taxa configurados."
          />
        )}
      </CardContent>
    </Card>
  );
}

function CampaignEfficiencyPanel({
  data,
  isLoading,
}: {
  data: GrowthResponse | null;
  isLoading: boolean;
}) {
  const campaigns = data?.campaigns.slice(0, 8) ?? [];
  const campaignMax = Math.max(...campaigns.map((campaign) => campaign.leads), 0);

  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-4 w-4 text-primary" />
          Eficiência das campanhas
        </CardTitle>
        <CardDescription>Volume de leads, matrículas e conversão por campanha.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : campaigns.length ? (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <GrowthDataBar
                key={campaign.campaign}
                label={campaign.campaign}
                value={campaign.leads}
                max={campaignMax}
                detail={`${campaign.enrollments} matrículas · ${formatPercent(campaign.conversionRate)}`}
                accent={campaign.enrollments ? "success" : "primary"}
              />
            ))}
          </div>
        ) : (
          <GrowthEmptyPanel
            icon={LineChartIcon}
            title="Sem campanhas no período"
            description="As campanhas aparecem quando os leads entram com identificação de origem."
          />
        )}
      </CardContent>
    </Card>
  );
}

function UnitPanel({ data, isLoading }: { data: GrowthResponse; isLoading: boolean }) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Unidades da rede
        </CardTitle>
        <CardDescription>Visão consolidada quando o escopo está em toda a rede.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <GrowthLoading />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.units.map((unit) => (
              <div key={unit.id} className="rounded-lg border border-border bg-background/65 p-4">
                <div className="truncate text-sm font-semibold">{unit.name}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Potencial</div>
                    <div className="font-bold">{formatCurrency(unit.pipelinePotential)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Confirmado</div>
                    <div className="font-bold text-success">{formatCurrency(unit.confirmedRevenue)}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {unit.leads} leads · {unit.enrollments} matrículas ·{" "}
                  {formatPercent(unit.conversionRate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
