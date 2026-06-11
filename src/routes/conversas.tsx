import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MessageCircle, Sparkles, ThumbsUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conversas")({
  head: () => ({ meta: [{ title: "Conversas IA · Planarius" }] }),
  component: Conversas,
});

function Conversas() {
  const highlights = [
    { label: "Conversas analisadas", value: "0", icon: MessageCircle, color: "text-primary bg-primary/10" },
    { label: "Score médio", value: "--", icon: Sparkles, color: "text-gold bg-gold/15" },
    { label: "Sentimento positivo", value: "0%", icon: ThumbsUp, color: "text-success bg-success/10" },
    { label: "Alertas críticos", value: "0", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="IA Comercial"
        title="Monitoramento de Conversas"
        description="A IA analisa conversas e ligações, identifica objeções, sentimentos e propõe treinamentos."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {highlights.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-3 p-5">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma conversa analisada"
            description="As análises aparecerão quando canais reais de atendimento forem conectados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
