import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  GraduationCap,
  Megaphone,
  MousePointer2,
  RadioTower,
  Signal,
  Target,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
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

const chartColors = ["#F97316", "#1236C9", "#22C55E", "#FF8A1F", "#C2410C", "#EF4444", "#06B6D4", "#8B5CF6"];

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

export const Route = createFileRoute("/branding")({
  head: () => ({ meta: [{ title: "Marketing e Aquisição - Master" }] }),
  component: Branding,
});

function Branding() {
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
  const campaignMax = Math.max(...(data?.campaigns.map((item) => item.leads) ?? [0]), 0);
  const sourcePie = data?.sources.map((item) => ({ name: item.source, value: item.leads })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="Marketing e Aquisição"
        description="Leitura completa de canais, campanhas Meta, volume, qualidade e conversão dos leads."
        actions={
          session ? (
            <div className="flex flex-wrap gap-2">
              <GrowthPeriodSelect value={periodDays} onValueChange={setPeriodDays} />
              <GrowthScopeSelect session={session} value={scopeValue} onValueChange={setScopeValue} />
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Leads totais" value={metricValue(isLoading, metrics.leadsReceived)} icon={Users} />
        <StatCard label="Leads Meta" value={metricValue(isLoading, metrics.metaLeads)} icon={RadioTower} accent="primary" />
        <StatCard label="Campanhas" value={metricValue(isLoading, metrics.campaignCount)} icon={Megaphone} accent="gold" />
        <StatCard label="Com origem" value={metricValue(isLoading, metrics.leadsWithSource)} icon={MousePointer2} />
        <StatCard label="Conversão origem" value={metricValue(isLoading, formatPercent(metrics.sourceConversionRate))} icon={Signal} accent="success" />
        <StatCard label="Canais ativos" value={metricValue(isLoading, metrics.activeChannels)} icon={Target} />
        <StatCard label="Canais pagos" value={metricValue(isLoading, metrics.paidChannels)} icon={BarChart3} accent="gold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]">
        <ChartCard title="Aquisição ao longo do tempo">
          {isLoading ? <GrowthLoading /> : data?.trend.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="marketingLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8A1F" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF8A1F" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={25} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <Tooltip labelFormatter={(value) => formatDay(String(value))} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#F97316" fill="url(#marketingLeads)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="enrollments" name="Matrículas" stroke="#1236C9" fill="transparent" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <GrowthEmptyPanel icon={Signal} title="Sem aquisição no período" description="A curva será preenchida conforme os leads entrarem." />}
        </ChartCard>

        <ChartCard title="Participação por origem">
          {isLoading ? <GrowthLoading /> : sourcePie.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourcePie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={105} paddingAngle={3}>
                    {sourcePie.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} leads`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <GrowthEmptyPanel icon={Megaphone} title="Sem origens identificadas" description="Cadastre ou mapeie os canais de aquisição." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Campanhas Meta por volume">
          {isLoading ? <GrowthLoading /> : data?.campaigns.length ? (
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.campaigns.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="campaign" width={190} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill="#F97316" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="enrollments" name="Matrículas" fill="#1236C9" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <GrowthEmptyPanel icon={RadioTower} title="Sem campanhas Meta" description="As campanhas aparecerão quando eventos Meta estiverem ligados aos leads." />}
        </ChartCard>

        <ChartCard title="Eficiência das campanhas">
          {isLoading ? <GrowthLoading /> : data?.campaigns.length ? (
            <div className="space-y-4">
              {data.campaigns.map((campaign) => (
                <GrowthDataBar key={campaign.campaign} label={campaign.campaign} value={campaign.leads} max={campaignMax} detail={`${campaign.enrollments} matrículas · ${formatPercent(campaign.conversionRate)}`} accent={campaign.enrollments ? "success" : "primary"} />
              ))}
            </div>
          ) : <GrowthEmptyPanel icon={GraduationCap} title="Sem conversão por campanha" description="A conversão será calculada quando os leads avançarem para matrícula." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Origens e qualidade">
          {isLoading ? <GrowthLoading /> : data?.sources.length ? (
            <div className="space-y-4">
              {data.sources.map((source) => (
                <GrowthDataBar key={source.source} label={source.source} value={source.leads} max={Math.max(...data.sources.map((item) => item.leads), 1)} detail={`${source.enrollments} matrículas · ${formatPercent(source.conversionRate)}`} accent={source.enrollments ? "gold" : "primary"} />
              ))}
            </div>
          ) : <GrowthEmptyPanel icon={Megaphone} title="Sem origens" description="Os canais aparecerão conforme forem gravados nos leads." />}
        </ChartCard>

        <ChartCard title="Praças com maior demanda">
          {isLoading ? <GrowthLoading /> : data?.cities.length ? (
            <div className="space-y-4">
              {data.cities.map((city) => (
                <GrowthDataBar key={city.city} label={city.city} value={city.leads} max={Math.max(...data.cities.map((item) => item.leads), 1)} detail={`${city.enrollments} matrículas · ${formatPercent(city.conversionRate)}`} accent="success" />
              ))}
            </div>
          ) : <GrowthEmptyPanel icon={Target} title="Sem praças identificadas" description="A análise regional depende da cidade roteada para o lead." />}
        </ChartCard>
      </div>
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
