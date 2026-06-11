import { createFileRoute } from "@tanstack/react-router";
import { Code2, CreditCard, FileText, GraduationCap, Mail, Megaphone, MessageCircle, Phone, Plug, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "Integrações · Planarius" }] }),
  component: Integrations,
});

const availableIntegrations = [
  { name: "Sistema Acadêmico", desc: "Turmas, alunos e matrículas", icon: GraduationCap },
  { name: "WhatsApp Business", desc: "Mensagens, automações e bots", icon: MessageCircle },
  { name: "E-mail Marketing", desc: "Disparos e jornadas automatizadas", icon: Mail },
  { name: "Telefonia / VoIP", desc: "Ligações, gravações e análise IA", icon: Phone },
  { name: "Meta Ads", desc: "Campanhas de Instagram e Facebook", icon: Megaphone },
  { name: "Google Ads", desc: "Pesquisa, Display e YouTube", icon: Search },
  { name: "Formulários / LP", desc: "Captura de leads em páginas", icon: FileText },
  { name: "Financeiro / Pagamentos", desc: "Boletos, Pix, cartão e recorrência", icon: CreditCard },
  { name: "API Aberta", desc: "Webhooks e integrações sob medida", icon: Code2 },
];

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
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Conexões reais</div>
              <div className="text-xl font-bold">Nenhuma integração configurada ainda</div>
              <p className="mt-1 max-w-2xl text-sm text-white/70">
                Quando uma conexão for ativada, ela aparecerá com status, origem e controles próprios.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <EmptyState
            icon={Plug}
            title="Sem integrações conectadas"
            description="A lista abaixo mostra apenas os tipos de conexão disponíveis para configuração."
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {availableIntegrations.map((i) => (
          <Card key={i.name} className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-sm">
                  <i.icon className="h-5 w-5" />
                </div>
                <Badge className="bg-muted text-muted-foreground" variant="secondary">Não conectado</Badge>
              </div>
              <div className="mt-4 text-base font-semibold">{i.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">{i.desc}</p>
              <Button variant="outline" size="sm" className="mt-4 w-full">Conectar</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
