import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap, MessageCircle, Mail, Phone, Megaphone, Search,
  FileText, Table as TableIcon, CreditCard, Code2, Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { integrations } from "@/lib/mock";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações · Planarius" }] }),
  component: Integrations,
});

const iconMap: Record<string, LucideIcon> = {
  GraduationCap, MessageCircle, Mail, Phone, Megaphone, Search, FileText, Table: TableIcon, CreditCard, Code2,
};

function Integrations() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conectividade"
        title="Integrações"
        description="Um hub conectado, sem substituir o que sua escola já usa. Sincronia em tempo real com o sistema acadêmico."
      />

      <Card className="overflow-hidden shadow-elegant">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20"><Plug className="h-6 w-6 text-gold" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Camada estratégica</div>
              <div className="text-xl font-bold">Planarius Growth Hub se conecta ao seu ecossistema</div>
              <p className="mt-1 max-w-2xl text-sm text-white/70">
                Mantemos seu sistema acadêmico, financeiro e canais de comunicação. Adicionamos a inteligência comercial em cima.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((i) => {
          const Icon = iconMap[i.icon] ?? Plug;
          const connected = i.status === "Conectado";
          return (
            <Card key={i.name} className="group shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className={connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"} variant="secondary">
                    {connected ? "● Conectado" : i.status}
                  </Badge>
                </div>
                <div className="mt-4 text-base font-semibold">{i.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{i.desc}</p>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  {connected ? "Configurar" : "Conectar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
