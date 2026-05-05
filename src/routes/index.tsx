import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, UserCheck, GraduationCap, TrendingUp, Timer, Phone,
  DollarSign, Wallet, AlertTriangle, ShieldCheck, CalendarCheck, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { kpis, revenueSeries, funnelData, cityData, sourceData, insights } from "@/lib/mock";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard Executivo · Planarius Growth Hub" }] }),
  component: Dashboard,
});

const PIE_COLORS = ["var(--color-primary)", "var(--color-primary-glow)", "var(--color-gold)", "var(--color-chart-4)", "var(--color-chart-5)"];

function Dashboard() {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3 w-3" /> Visão executiva · Junho 2026
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Bom dia, Junior. Sua escola está <span className="text-gradient-gold">crescendo 18.4%</span> este mês.</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              R$ 1.41M faturados · 218 matrículas · IA recuperou 132 alunos em risco. Confira oportunidades abaixo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90"><Link to="/estrategia">Ver plano de ação</Link></Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10"><Link to="/crm">Abrir CRM</Link></Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Leads recebidos" value={fmt(kpis.leads)} delta={12} icon={Users} accent="primary" />
        <StatCard label="Qualificados" value={fmt(kpis.qualified)} delta={8} icon={UserCheck} accent="primary" />
        <StatCard label="Matrículas" value={fmt(kpis.enrollments)} delta={18} icon={GraduationCap} accent="gold" />
        <StatCard label="Conversão" value={`${kpis.conversion}%`} delta={3} icon={TrendingUp} accent="success" />
        <StatCard label="Speed-to-lead" value={kpis.speedToLead} delta={-22} icon={Timer} accent="success" hint="vs. mês anterior" />
        <StatCard label="Follow-up" value={`${kpis.followupRate}%`} delta={5} icon={Phone} accent="primary" />
        <StatCard label="Ticket médio" value={brl(kpis.avgTicket)} delta={4} icon={DollarSign} accent="primary" />
        <StatCard label="Faturamento" value={brl(kpis.revenue)} delta={18} icon={Wallet} accent="gold" />
        <StatCard label="Inadimplência" value={`${kpis.delinquency}%`} delta={-9} icon={AlertTriangle} accent="warning" />
        <StatCard label="No-show em risco" value={kpis.noShowRisk} delta={-14} icon={AlertTriangle} accent="warning" />
        <StatCard label="Recuperados (IA)" value={kpis.recovered} delta={32} icon={ShieldCheck} accent="success" />
        <StatCard label="Comparecimento" value={`${kpis.attendance}%`} delta={6} icon={CalendarCheck} accent="success" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Faturamento — Realizado vs Previsto</CardTitle>
              <p className="text-xs text-muted-foreground">Em milhares de reais</p>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success">+18% YoY</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="prev" name="Previsto" stroke="var(--color-gold)" fill="url(#g2)" strokeWidth={2} />
                <Area type="monotone" dataKey="real" name="Realizado" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Origem dos leads</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader><CardTitle className="text-base">Funil comercial</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="var(--color-muted-foreground)" fontSize={12} width={110} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Performance por cidade</CardTitle>
            <p className="text-xs text-muted-foreground">Conversão %</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {cityData.map((c) => (
              <div key={c.city}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{c.city}</span>
                  <span className="text-muted-foreground">{c.leads} leads · {c.conv}%</span>
                </div>
                <Progress value={c.conv * 4} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Insights IA */}
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold"><Sparkles className="h-4 w-4 text-gold-foreground" /></div>
            <div>
              <CardTitle className="text-base">Insights da IA</CardTitle>
              <p className="text-xs text-muted-foreground">Recomendações priorizadas para sua escola</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/estrategia">Ver todos</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.slice(0, 3).map((i) => (
            <div key={i.title} className="rounded-lg border border-border bg-accent/30 p-4">
              <Badge className={`mb-2 ${i.tone === "warning" ? "bg-warning/15 text-warning" : i.tone === "success" ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`} variant="secondary">
                {i.tone === "warning" ? "Alerta" : i.tone === "success" ? "Oportunidade" : "Insight"}
              </Badge>
              <div className="font-semibold">{i.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
              <div className="mt-3 text-xs font-semibold text-gold">{i.impact}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
