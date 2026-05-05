import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Crown, Medal, Award, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { rankingData } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking · Planarius" }] }),
  component: Ranking,
});

function Ranking() {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const top3 = rankingData.slice(0, 3);
  const rest = rankingData.slice(3);
  const podiumIcons = [Crown, Medal, Award];

  return (
    <div>
      <PageHeader
        eyebrow="Gamificação"
        title="Ranking da Equipe Comercial"
        description="Performance ponderada por volume, qualidade, follow-up e comparecimento dos alunos."
        actions={<Button variant="outline"><Filter className="mr-2 h-4 w-4" />Junho · Todas unidades</Button>}
      />

      {/* Podium */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[top3[1], top3[0], top3[2]].map((p, idx) => {
          const realPos = p.pos;
          const Icon = podiumIcons[realPos - 1];
          const isFirst = realPos === 1;
          return (
            <Card key={p.name} className={cn(
              "relative overflow-hidden shadow-card transition-transform",
              isFirst ? "md:-mt-4 border-gold/40" : "",
            )}>
              <div className={cn("absolute inset-x-0 top-0 h-1", isFirst ? "bg-gradient-gold" : realPos === 2 ? "bg-primary" : "bg-muted-foreground/40")} />
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className={cn("absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full",
                  isFirst ? "bg-gradient-gold text-gold-foreground" : "bg-primary/10 text-primary")}>
                  <Icon className="h-5 w-5" />
                </div>
                <Avatar className={cn("h-20 w-20", isFirst && "ring-4 ring-gold/30")}>
                  <AvatarFallback className="bg-gradient-primary text-xl text-primary-foreground">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#{realPos} lugar</div>
                <div className="text-lg font-bold">{p.name}</div>
                <div className="mt-3 grid w-full grid-cols-2 gap-2 text-left">
                  <div className="rounded-md bg-accent/40 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Vendido</div>
                    <div className="text-sm font-bold text-primary">{brl(p.revenue)}</div>
                  </div>
                  <div className="rounded-md bg-accent/40 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Score</div>
                    <div className={cn("text-sm font-bold", isFirst ? "text-gold" : "text-primary")}>{p.score}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Vendedor</div>
            <div className="col-span-1 text-center">Vendas</div>
            <div className="col-span-2">Faturado</div>
            <div className="col-span-1 text-center">Conv.</div>
            <div className="col-span-1 text-center">Resp.</div>
            <div className="col-span-1 text-center">F-up</div>
            <div className="col-span-1 text-center">Compar.</div>
            <div className="col-span-2">Score</div>
          </div>
          {rankingData.map((p) => (
            <div key={p.name} className="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3 last:border-0 hover:bg-accent/30">
              <div className="col-span-3 flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-muted-foreground">#{p.pos}</span>
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">{p.initials}</AvatarFallback></Avatar>
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  {p.pos <= 3 && <Badge className="bg-gold/15 text-gold text-[9px]" variant="secondary">Top performer</Badge>}
                </div>
              </div>
              <div className="col-span-1 text-center text-sm font-semibold">{p.sales}</div>
              <div className="col-span-2 text-sm font-medium">{brl(p.revenue)}</div>
              <div className="col-span-1 text-center text-sm">{p.conv}%</div>
              <div className="col-span-1 text-center text-xs text-muted-foreground">{p.response}</div>
              <div className="col-span-1 text-center text-sm">{p.followup}%</div>
              <div className="col-span-1 text-center text-sm">{p.attendance}%</div>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <Progress value={(p.score / 1000) * 100} className="h-2 flex-1" />
                  <span className="text-sm font-bold text-primary">{p.score}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
