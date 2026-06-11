import { createFileRoute } from "@tanstack/react-router";
import { Filter, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking · Planarius" }] }),
  component: Ranking,
});

function Ranking() {
  return (
    <div>
      <PageHeader
        eyebrow="Gamificação"
        title="Ranking da Equipe Comercial"
        description="Performance ponderada por volume, qualidade, follow-up e comparecimento dos alunos."
        actions={<Button variant="outline"><Filter className="mr-2 h-4 w-4" />Período atual</Button>}
      />

      <Card className="shadow-card">
        <CardContent className="p-4">
          <EmptyState
            icon={Trophy}
            title="Nenhum vendedor ranqueado"
            description="O ranking será montado quando houver vendedores e vendas reais vinculadas às unidades."
          />
        </CardContent>
      </Card>
    </div>
  );
}
