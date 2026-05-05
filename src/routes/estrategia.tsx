import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { insights } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/estrategia")({
  head: () => ({ meta: [{ title: "Visão Estratégica · Planarius" }] }),
  component: Strategy,
});

const actionPlan = [
  { p: "Alta", title: "Implementar SLA de 5 minutos no atendimento", impact: "+R$ 184k", effort: "Baixo" },
  { p: "Alta", title: "Abrir nova turma de Harmonização em Florianópolis", impact: "+58 matrículas", effort: "Médio" },
  { p: "Média", title: "Treinamento de fechamento para time de Curitiba", impact: "+12% conv.", effort: "Médio" },
  { p: "Média", title: "Aumentar verba de mídia em Microblading", impact: "+R$ 92k receita", effort: "Baixo" },
  { p: "Baixa", title: "Revisar scripts de WhatsApp por curso", impact: "+4% conv.", effort: "Baixo" },
];

function Strategy() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão executiva"
        title="Visão Estratégica"
        description="A IA analisa todos os dados e propõe um plano de ação priorizado para o crescimento da escola."
      />

      <Card className="overflow-hidden shadow-elegant">
        <div className="bg-gradient-hero p-8 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold"><Sparkles className="h-6 w-6 text-gold-foreground" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Diagnóstico inteligente</div>
              <div className="text-2xl font-bold">Sua escola pode crescer <span className="text-gradient-gold">+34% nos próximos 90 dias</span></div>
              <p className="mt-1 max-w-2xl text-sm text-white/70">
                Identificamos 5 oportunidades de alto impacto e 3 gargalos críticos. Estimativa de R$ 1.2M em receita adicional.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-warning" />Gargalos atuais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.filter((i) => i.tone === "warning").map((i) => (
              <div key={i.title} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="font-semibold">{i.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
                <div className="mt-2 text-xs font-semibold text-warning">{i.impact}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-success" />Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.filter((i) => i.tone === "success").map((i) => (
              <div key={i.title} className="rounded-lg border border-success/30 bg-success/5 p-4">
                <div className="font-semibold">{i.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
                <div className="mt-2 text-xs font-semibold text-success">{i.impact}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />Plano de ação priorizado</CardTitle>
          <p className="text-xs text-muted-foreground">Recomendado pela IA com base nos seus dados dos últimos 90 dias</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {actionPlan.map((a, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent/30">
              <div className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg font-bold",
                a.p === "Alta" ? "bg-destructive/10 text-destructive" :
                a.p === "Média" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
              )}>{i + 1}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{a.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Prioridade {a.p}</Badge>
                  <Badge variant="outline">Esforço {a.effort}</Badge>
                  <span className="font-semibold text-gold">Impacto: {a.impact}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost"><ArrowRight className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-elegant">
        <div className="grid gap-0 md:grid-cols-3">
          {[
            { icon: Lightbulb, label: "Ideias da IA", value: "12 novas" },
            { icon: CheckCircle2, label: "Ações implementadas", value: "28 / mês" },
            { icon: TrendingUp, label: "Crescimento previsto", value: "+34%" },
          ].map((s, i) => (
            <div key={i} className={cn("flex items-center gap-4 p-6", i < 2 && "md:border-r border-border")}>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><s.icon className="h-6 w-6" /></div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
