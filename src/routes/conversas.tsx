import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone, Sparkles, AlertTriangle, ThumbsUp, Smile, Meh, Frown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { conversations } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conversas")({
  head: () => ({ meta: [{ title: "Conversas IA · Planarius" }] }),
  component: Conversas,
});

const sentimentMap = {
  Positivo: { icon: Smile, color: "text-success bg-success/10" },
  Neutro: { icon: Meh, color: "text-warning bg-warning/10" },
  Negativo: { icon: Frown, color: "text-destructive bg-destructive/10" },
};

function Conversas() {
  return (
    <div>
      <PageHeader
        eyebrow="IA Comercial"
        title="Monitoramento de Conversas"
        description="A IA analisa cada conversa e ligação, identifica objeções, sentimentos e propõe treinamentos."
      />

      {/* Highlights */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Conversas analisadas", value: "1.284", icon: MessageCircle, color: "text-primary bg-primary/10" },
          { label: "Score médio", value: "78", icon: Sparkles, color: "text-gold bg-gold/15" },
          { label: "Sentimento positivo", value: "64%", icon: ThumbsUp, color: "text-success bg-success/10" },
          { label: "Alertas críticos", value: "12", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-3 p-5">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", s.color)}><s.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {conversations.map((c) => {
          const SIcon = sentimentMap[c.sentiment as keyof typeof sentimentMap].icon;
          const sColor = sentimentMap[c.sentiment as keyof typeof sentimentMap].color;
          const ChannelIcon = c.channel === "WhatsApp" ? MessageCircle : Phone;
          return (
            <Card key={c.id} className="shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <CardContent className="grid gap-4 p-5 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChannelIcon className="h-4 w-4" /></div>
                    <div>
                      <div className="text-sm font-semibold">{c.seller}</div>
                      <div className="text-xs text-muted-foreground">com {c.lead}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.duration}</Badge>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Score IA</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={c.score} className="h-2 flex-1" />
                    <span className={cn("text-sm font-bold", c.score > 80 ? "text-gold" : c.score > 60 ? "text-primary" : "text-destructive")}>{c.score}</span>
                  </div>
                  <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", sColor)}>
                    <SIcon className="h-3 w-3" />{c.sentiment}
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Objeção detectada</div>
                  <div className="text-sm font-medium">{c.objection}</div>
                  <div className="mt-2 text-[10px] uppercase text-muted-foreground">Conversão estimada</div>
                  <div className="text-sm font-semibold text-primary">{c.convChance}%</div>
                </div>
                <div className="lg:col-span-4 space-y-2">
                  <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs">
                    <span className="font-semibold text-success">Ponto forte:</span> {c.strength}
                  </div>
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs">
                    <span className="font-semibold text-warning">A melhorar:</span> {c.improvement}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
