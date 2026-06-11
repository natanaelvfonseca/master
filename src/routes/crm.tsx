import { createFileRoute } from "@tanstack/react-router";
import { Filter, KanbanSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM Pipeline · Planarius Growth Hub" }] }),
  component: CRM,
});

const stages = [
  "Novo lead",
  "Em contato",
  "Qualificado",
  "Proposta",
  "Pagamento pendente",
  "Confirmado",
  "Recuperação",
  "Matriculado",
];

function CRM() {
  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="CRM Pipeline"
        description="Pipeline visual com lead score por IA, alertas de follow-up e priorização inteligente."
        actions={
          <>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtros</Button>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Novo lead</Button>
          </>
        }
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {stages.map((stage) => (
            <div key={stage} className="w-[280px] flex-shrink-0">
              <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 shadow-card">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{stage}</div>
                  <div className="text-sm font-semibold">0 leads</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Pipeline</div>
                  <div className="text-xs font-semibold text-primary">R$ 0</div>
                </div>
              </div>
              <Card className="p-3 shadow-card">
                <EmptyState
                  icon={KanbanSquare}
                  title="Sem leads"
                  description="Quando houver registros reais, eles aparecerão neste estágio."
                />
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
