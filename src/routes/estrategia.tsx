import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Sparkles, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/estrategia")({
  head: () => ({ meta: [{ title: "Visão Estratégica · Master" }] }),
  component: Strategy,
});

function Strategy() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão executiva"
        title="Visão Estratégica"
        description="A IA analisará os dados reais e proporá um plano de ação priorizado para crescimento."
      />

      <Card className="shadow-card">
        <CardContent className="p-4">
          <EmptyState
            icon={Sparkles}
            title="Visão estratégica ainda sem dados"
            description="Esta área está preservada para uso futuro e será ativada quando houver base operacional suficiente."
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-warning" />Gargalos atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={AlertTriangle} title="Sem gargalos identificados" />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-success" />Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={TrendingUp} title="Sem oportunidades calculadas" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />Plano de ação priorizado</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Target}
            title="Nenhuma ação priorizada"
            description="O plano será gerado a partir de indicadores reais da unidade."
          />
        </CardContent>
      </Card>
    </div>
  );
}
