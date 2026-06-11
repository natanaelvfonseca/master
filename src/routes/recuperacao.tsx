import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bot, MessageCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/recuperacao")({
  head: () => ({ meta: [{ title: "Recuperação · Planarius" }] }),
  component: Recovery,
});

function Recovery() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="Recuperação & Comparecimento"
        description="Automação inteligente para reduzir inadimplência e no-show a partir de dados reais."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Alunos em risco" value={0} icon={AlertTriangle} accent="warning" />
        <StatCard label="Recuperados (mês)" value={0} icon={ShieldCheck} accent="success" />
        <StatCard label="Taxa de recuperação" value="0%" icon={TrendingUp} accent="success" />
        <StatCard label="Perda evitada" value="R$ 0" icon={ShieldCheck} accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Performance das automações</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Bot}
              title="Sem jornadas executadas"
              description="As métricas de recuperação serão exibidas quando existirem fluxos reais rodando."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Fluxos ativos</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={MessageCircle}
              title="Nenhum fluxo ativo"
              description="Fluxos de WhatsApp, e-mail e ligação aparecerão após configuração."
            />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Alunos em risco</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={AlertTriangle}
            title="Sem alunos em risco"
            description="A lista será calculada quando houver matrículas, pagamentos e presença conectados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
