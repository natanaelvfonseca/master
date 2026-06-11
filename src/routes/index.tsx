import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  DollarSign,
  GraduationCap,
  LineChart,
  Phone,
  PieChart,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard Executivo · Planarius Growth Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { session } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const userName = session?.user.name ?? "Plenarius";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:p-8">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3 w-3" /> Visão executiva
            </div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              {greeting}, {userName}. Aguardando dados reais da operação.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Os indicadores serão preenchidos quando leads, vendas, conversas e campanhas forem conectados ao banco da Plenarius.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
              <Link to="/crm">Abrir CRM</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Leads recebidos" value={0} icon={Users} accent="primary" />
        <StatCard label="Qualificados" value={0} icon={UserCheck} accent="primary" />
        <StatCard label="Matrículas" value={0} icon={GraduationCap} accent="gold" />
        <StatCard label="Conversão" value="0%" icon={LineChart} accent="success" />
        <StatCard label="Speed-to-lead" value="--" icon={Timer} accent="success" />
        <StatCard label="Follow-up" value="0%" icon={Phone} accent="primary" />
        <StatCard label="Ticket médio" value="R$ 0" icon={DollarSign} accent="primary" />
        <StatCard label="Faturamento" value="R$ 0" icon={Wallet} accent="gold" />
        <StatCard label="Inadimplência" value="0%" icon={AlertTriangle} accent="warning" />
        <StatCard label="No-show em risco" value={0} icon={AlertTriangle} accent="warning" />
        <StatCard label="Recuperados (IA)" value={0} icon={ShieldCheck} accent="success" />
        <StatCard label="Comparecimento" value="0%" icon={CalendarCheck} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={LineChart}
              title="Sem faturamento registrado"
              description="Quando houver vendas reais, o comparativo de realizado e previsto aparecerá aqui."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Origem dos leads</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={PieChart}
              title="Sem origens capturadas"
              description="As fontes de aquisição serão exibidas depois que os leads entrarem no sistema."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader><CardTitle className="text-base">Funil comercial</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sem movimentação no funil"
              description="Os estágios do funil serão alimentados quando existirem leads reais no CRM."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Performance por cidade</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sem dados por cidade"
              description="A distribuição geográfica será calculada a partir dos leads cadastrados."
            />
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
              <p className="text-xs text-muted-foreground">Recomendações priorizadas para sua escola</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Sparkles}
            title="Sem insights gerados"
            description="A IA começará a sugerir ações quando houver dados comerciais suficientes."
          />
        </CardContent>
      </Card>
    </div>
  );
}
