import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  DollarSign,
  GraduationCap,
  LineChart as LineChartIcon,
  Phone,
  Sparkles,
  UserCheck,
  Users,
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
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { canViewNetworkGrowth } from "@/lib/auth-types";
import { useGrowthData } from "@/lib/use-growth-data";
import {
  formatCurrency,
  formatPercent,
  GrowthDataBar,
  GrowthEmptyPanel,
  GrowthLoading,
  metricValue,
} from "@/components/growth/GrowthDashboardPrimitives";

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

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard Executivo · Planarius Growth Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { session, loading: authLoading } = useAuth();
  const canViewNetwork = session ? canViewNetworkGrowth(session.user.role) : false;
  const scopeValue = canViewNetwork ? "all" : (session?.activeUnit?.id ?? "");
  const { data, loading } = useGrowthData(scopeValue, Boolean(session && scopeValue), 30);
  const metrics = data?.metrics ?? emptyMetrics;
  const isLoading = authLoading || loading;
  const isConsultant = session?.user.role === "CONSULTOR";
  const funnelData = data?.funnel.filter((item) => item.leads > 0) ?? [];
  const sourceMax = Math.max(...(data?.sources.map((item) => item.leads) ?? [0]), 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl bg-[#0B2A6F] px-5 py-6 text-white shadow-elegant md:px-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gold" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="border-white/15 bg-white/10 text-gold">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Últimos 30 dias
            </Badge>
            <h1 className="mt-4 text-2xl font-bold md:text-3xl">
              {greeting}, {session?.user.name ?? "Plenarius"}.
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {data?.scope.label ?? session?.activeUnit?.name ?? "Operação comercial"} · visão
              resumida de aquisição e vendas.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-fit bg-white text-[#0B2A6F]">
            <Link to="/crm">Abrir CRM</Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Leads" value={metricValue(isLoading, metrics.leadsReceived)} icon={Users} hint="30 dias" />
        <StatCard label="Qualificados" value={metricValue(isLoading, metrics.qualifiedLeads)} icon={UserCheck} />
        <StatCard label="Matrículas" value={metricValue(isLoading, metrics.enrollments)} icon={GraduationCap} accent="gold" />
        <StatCard label="Conversão" value={metricValue(isLoading, formatPercent(metrics.conversionRate))} icon={LineChartIcon} accent="success" />
        <StatCard label="Follow-up" value={metricValue(isLoading, formatPercent(metrics.followUpRate))} icon={Phone} />
        <StatCard label="Receita estimada" value={metricValue(isLoading, formatCurrency(metrics.revenue))} icon={DollarSign} accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Ritmo de entrada e matrículas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.trend.length ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="dashboardLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1746B8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#1746B8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tickFormatter={formatDay} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <Tooltip labelFormatter={(value) => formatDay(String(value))} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#1746B8" fill="url(#dashboardLeads)" strokeWidth={2} />
                    <Area type="monotone" dataKey="enrollments" name="Matrículas" stroke="#E3AA2B" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <GrowthEmptyPanel icon={Activity} title="Sem movimento no período" description="Os dados aparecerão conforme novos leads entrarem." />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição no funil</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : funnelData.length ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="stage" width={112} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="leads" name="Leads" fill="#3F73D8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <GrowthEmptyPanel icon={Activity} title="Funil vazio" description="Sem leads no período selecionado." />
            )}
          </CardContent>
        </Card>
      </div>

      {!isConsultant ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Principais origens</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.sources.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.sources.slice(0, 6).map((source) => (
                  <GrowthDataBar
                    key={source.source}
                    label={source.source}
                    value={source.leads}
                    max={sourceMax}
                    detail={`${source.enrollments} matrículas · ${formatPercent(source.conversionRate)}`}
                    accent={source.enrollments ? "success" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <GrowthEmptyPanel icon={Users} title="Sem origens capturadas" description="As origens aparecem quando os leads chegam com canal identificado." />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
