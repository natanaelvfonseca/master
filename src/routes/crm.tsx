import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Flame, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stages, leads } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM Pipeline · Planarius Growth Hub" }] }),
  component: CRM,
});

function CRM() {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="CRM Pipeline"
        description="Pipeline visual com lead score por IA, alertas de follow-up e priorização inteligente."
        actions={
          <>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtros</Button>
            <Button className="bg-gradient-primary text-primary-foreground">+ Novo lead</Button>
          </>
        }
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const total = items.reduce((s, l) => s + l.value, 0);
            return (
              <div key={stage} className="w-[280px] flex-shrink-0">
                <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 shadow-card">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{stage}</div>
                    <div className="text-sm font-semibold">{items.length} leads</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Pipeline</div>
                    <div className="text-xs font-semibold text-primary">{brl(total)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.slice(0, 4).map((l) => (
                    <Card key={l.id} className="group cursor-pointer p-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                      <Link to="/leads/$id" params={{ id: l.id }} className="block">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{l.name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{l.course}</div>
                          </div>
                          {l.hot && (
                            <Badge className="gap-1 bg-destructive/10 text-destructive" variant="secondary">
                              <Flame className="h-3 w-3" /> Quente
                            </Badge>
                          )}
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{l.city}</Badge>
                          <Badge variant="outline" className="text-[10px]">{l.source}</Badge>
                        </div>
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex-1">
                            <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Sparkles className="h-2.5 w-2.5 text-gold" />IA Score</span>
                              <span>{l.score}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full", l.score > 80 ? "bg-gold" : l.score > 60 ? "bg-primary" : "bg-muted-foreground/40")} style={{ width: `${l.score}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{l.seller}</span>
                          {l.lastContactDays > 4 ? (
                            <span className="inline-flex items-center gap-1 text-warning"><AlertCircle className="h-3 w-3" />Sem follow-up</span>
                          ) : (
                            <span className="font-semibold text-primary">{brl(l.value)}</span>
                          )}
                        </div>
                      </Link>
                    </Card>
                  ))}
                  {items.length > 4 && (
                    <button className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground">
                      Ver mais {items.length - 4} <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
