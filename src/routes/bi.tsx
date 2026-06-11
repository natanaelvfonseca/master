import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, Filter, LineChart, Radar } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bi")({
  head: () => ({ meta: [{ title: "BI Comercial · Planarius" }] }),
  component: BI,
});

function BI() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inteligência"
        title="BI & Métricas Comerciais"
        description="Análise multidimensional por vendedor, origem, cidade, curso e campanha."
        actions={
          <>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtros</Button>
            <Button disabled className="bg-gradient-primary"><Download className="mr-2 h-4 w-4" />Exportar</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Conversão por cidade</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sem dados de cidade"
              description="O gráfico será calculado quando os leads reais tiverem cidade cadastrada."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Maturidade comercial</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={Radar}
              title="Sem indicadores"
              description="A maturidade será montada a partir de conversão, follow-up e comparecimento reais."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Performance por curso</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Sem cursos com performance"
              description="Os cursos aparecerão quando houver matrículas e vendas registradas."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Tempo médio de fechamento</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={LineChart}
              title="Sem ciclo de vendas"
              description="O tempo médio será calculado quando houver oportunidades concluídas."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
