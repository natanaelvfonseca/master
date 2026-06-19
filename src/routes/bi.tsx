import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Clock3,
  DollarSign,
  GraduationCap,
  LineChart as LineChartIcon,
  Phone,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatPercent,
  GrowthDataBar,
  GrowthEmptyPanel,
  GrowthLoading,
  GrowthPeriodSelect,
  GrowthScopeSelect,
  metricValue,
} from "@/components/growth/GrowthDashboardPrimitives";
import { useAuth } from "@/lib/auth";
import { canViewNetworkGrowth } from "@/lib/auth-types";
import { useGrowthData } from "@/lib/use-growth-data";

const emptyMetrics = {
  leadsReceived: 0,
  qualifiedLeads: 0,
  enrollments: 0,
  conversionRate: 0,
  followUpRate: 0,
  averageTicket: 0,
  leadsWithSource: 0,
  sourceConversionRate: 0,
  activeChannels: 0,
  paidChannels: 0,
  revenue: 0,
  metaLeads: 0,
  campaignCount: 0,
  averageFirstContactHours: 0,
};

function formatDay(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

export const Route = createFileRoute("/bi")({
  head: () => ({ meta: [{ title: "BI Comercial - Planarius" }] }),
  component: BI,
});

function BI() {
  const { session, loading: authLoading } = useAuth();
  const [scopeValue, setScopeValue] = React.useState("");
  const [periodDays, setPeriodDays] = React.useState(30);
  const canViewNetwork = session ? canViewNetworkGrowth(session.user.role) : false;
  const activeUnitId = session?.activeUnit?.id ?? "";

  React.useEffect(() => {
    if (!session) return;
    setScopeValue((current) => {
      if (!canViewNetwork) return activeUnitId;
      return current === "all" || session.units.some((unit) => unit.id === current) ? current : "all";
    });
  }, [activeUnitId, canViewNetwork, session]);

  const { data, loading } = useGrowthData(scopeValue, Boolean(session && scopeValue), periodDays);
  const isLoading = authLoading || loading;
  const metrics = data?.metrics ?? emptyMetrics;
  const courseMax = Math.max(...(data?.courses.map((item) => item.leads) ?? [0]), 0);
  const cityMax = Math.max(...(data?.cities.map((item) => item.leads) ?? [0]), 0);
  const funnelData = data?.funnel.filter((item) => item.leads > 0) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="Comercial"
        description="Performance do funil, velocidade de atendimento, conversão, receita e produtividade da equipe."
        actions={
          session ? (
            <div className="flex flex-wrap gap-2">
              <GrowthPeriodSelect value={periodDays} onValueChange={setPeriodDays} />
              <GrowthScopeSelect session={session} value={scopeValue} onValueChange={setScopeValue} />
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Leads" value={metricValue(isLoading, metrics.leadsReceived)} icon={Users} />
        <StatCard label="Qualificados" value={metricValue(isLoading, metrics.qualifiedLeads)} icon={UserCheck} />
        <StatCard label="Matrículas" value={metricValue(isLoading, metrics.enrollments)} icon={GraduationCap} accent="gold" />
        <StatCard label="Conversão" value={metricValue(isLoading, formatPercent(metrics.conversionRate))} icon={LineChartIcon} accent="success" />
        <StatCard label="Follow-up" value={metricValue(isLoading, formatPercent(metrics.followUpRate))} icon={Phone} />
        <StatCard label="1º contato" value={metricValue(isLoading, `${metrics.averageFirstContactHours.toFixed(1)}h`)} icon={Clock3} accent="warning" />
        <StatCard label="Ticket médio" value={metricValue(isLoading, formatCurrency(metrics.averageTicket))} icon={Target} />
        <StatCard label="Receita" value={metricValue(isLoading, formatCurrency(metrics.revenue))} icon={DollarSign} accent="gold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <ChartCard title="Evolução comercial">
          {isLoading ? <GrowthLoading /> : data?.trend.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="commercialLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1746B8" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#1746B8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={25} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <Tooltip labelFormatter={(value) => formatDay(String(value))} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#1746B8" fill="url(#commercialLeads)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="enrollments" name="Matrículas" stroke="#E3AA2B" fill="transparent" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <GrowthEmptyPanel icon={Activity} title="Sem evolução no período" description="A série será preenchida com a entrada de novos leads." />}
        </ChartCard>

        <ChartCard title="Funil por etapa">
          {isLoading ? <GrowthLoading /> : funnelData.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 6 }}>
                  <CartesianGrid horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="stage" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" radius={[0, 5, 5, 0]}>
                    {funnelData.map((item) => <Cell key={item.stage} fill={item.stage === "Matriculado" ? "#E3AA2B" : "#3F73D8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <GrowthEmptyPanel icon={Activity} title="Funil vazio" description="Não há leads no período selecionado." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Performance por curso">
          {isLoading ? <GrowthLoading /> : data?.courses.length ? (
            <div className="space-y-4">
              {data.courses.map((course) => (
                <GrowthDataBar key={course.course} label={course.course} value={course.leads} max={courseMax} detail={`${course.enrollments} matrículas · ${formatPercent(course.conversionRate)}`} accent={course.enrollments ? "success" : "primary"} />
              ))}
            </div>
          ) : <GrowthEmptyPanel icon={GraduationCap} title="Sem cursos no período" description="Os cursos aparecerão conforme os leads forem roteados." />}
        </ChartCard>

        <ChartCard title="Conversão por cidade">
          {isLoading ? <GrowthLoading /> : data?.cities.length ? (
            <div className="space-y-4">
              {data.cities.map((city) => (
                <GrowthDataBar key={city.city} label={city.city} value={city.leads} max={cityMax} detail={`${city.enrollments} matrículas · ${formatPercent(city.conversionRate)}`} accent="success" />
              ))}
            </div>
          ) : <GrowthEmptyPanel icon={Target} title="Sem cidades no período" description="A análise geográfica depende da cidade registrada no lead." />}
        </ChartCard>
      </div>

      <ChartCard title={data?.scope.mode === "individual" ? "Minha produtividade" : "Performance dos consultores"}>
        {isLoading ? <GrowthLoading /> : data?.consultants.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-2">
              <div className="grid grid-cols-[minmax(180px,1fr)_repeat(5,100px)] gap-3 border-b px-3 pb-2 text-xs font-semibold text-muted-foreground">
                <span>Consultor</span><span>Leads</span><span>Qualificados</span><span>Matrículas</span><span>Conversão</span><span>Follow-up</span>
              </div>
              {data.consultants.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(180px,1fr)_repeat(5,100px)] gap-3 rounded-md bg-muted/25 px-3 py-3 text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span>{item.leads}</span>
                  <span>{item.qualifiedLeads}</span>
                  <span>{item.enrollments}</span>
                  <span>{formatPercent(item.conversionRate)}</span>
                  <span>{formatPercent(item.followUpRate)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <GrowthEmptyPanel icon={Users} title="Sem produtividade calculada" description="Os consultores aparecerão quando receberem leads." />}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
