import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Phone, Mail, MessageCircle, MapPin, GraduationCap, ArrowLeft,
  Sparkles, AlertTriangle, CheckCircle2, Calendar, Flame, TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { leads } from "@/lib/mock";

export const Route = createFileRoute("/leads/$id")({
  head: ({ params }) => ({ meta: [{ title: `Lead ${params.id} · Planarius` }] }),
  component: LeadDetail,
  notFoundComponent: () => <div className="p-8">Lead não encontrado. <Link to="/leads" className="text-primary underline">Voltar</Link></div>,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const lead = leads.find((l) => l.id === id);
  if (!lead) throw notFound();
  const initials = lead.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const timeline = [
    { icon: MessageCircle, text: "Mensagem enviada via WhatsApp", time: "Há 2 horas", who: lead.seller },
    { icon: Phone, text: "Ligação realizada — 8min", time: "Ontem, 16:42", who: lead.seller },
    { icon: Mail, text: "Proposta enviada por e-mail", time: "Há 2 dias", who: lead.seller },
    { icon: Sparkles, text: "Lead capturado via Instagram Ads", time: "Há 4 dias", who: "Sistema" },
  ];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/crm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao pipeline</Link></Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card className="shadow-card lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20"><AvatarFallback className="bg-gradient-primary text-2xl text-primary-foreground">{initials}</AvatarFallback></Avatar>
              <h2 className="mt-3 text-xl font-bold">{lead.name}</h2>
              <p className="text-sm text-muted-foreground">{lead.id}</p>
              {lead.hot && <Badge className="mt-2 gap-1 bg-destructive/10 text-destructive" variant="secondary"><Flame className="h-3 w-3" />Lead quente</Badge>}
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Curso:</span><span className="font-medium">{lead.course}</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Cidade:</span><span className="font-medium">{lead.city}</span></div>
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Origem:</span><Badge variant="outline">{lead.source}</Badge></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Status:</span><Badge variant="secondary" className="bg-primary/10 text-primary">{lead.stage}</Badge></div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" className="bg-gradient-primary"><MessageCircle className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline"><Phone className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline"><Mail className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* IA + Timeline */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-card overflow-hidden">
            <div className="bg-gradient-hero p-5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20"><Sparkles className="h-4 w-4 text-gold" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Inteligência Artificial</div>
                  <div className="font-semibold">Análise do lead</div>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">Chance de conversão</span>
                  <span className="font-bold text-primary">{lead.score}%</span>
                </div>
                <Progress value={lead.score} className="h-2" />
              </div>
              <div className="rounded-lg border border-border bg-accent/30 p-3 text-sm">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gold">Resumo automático</div>
                <p>Lead demonstrou alto interesse em {lead.course}, mencionou disponibilidade para o próximo final de semana e sinalizou orçamento aprovado pela família. Tom de mensagens positivo e engajado.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-warning"><AlertTriangle className="h-3.5 w-3.5" />Objeções identificadas</div>
                  <p className="text-xs">Preocupação com parcelamento e logística de viagem.</p>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" />Sugestão de abordagem</div>
                  <p className="text-xs">Oferecer parcelamento em 6x e enviar guia de hospedagem parceira.</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="mb-1 text-xs font-semibold text-primary">Próximo passo recomendado</div>
                <p className="text-xs">Ligar nas próximas 2h para fechar a matrícula. Probabilidade de conversão cai 18% após 24h sem contato.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Timeline de interações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><t.icon className="h-4 w-4" /></div>
                    {i < timeline.length - 1 && <div className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-sm font-medium">{t.text}</div>
                    <div className="text-xs text-muted-foreground">{t.time} · {t.who}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
