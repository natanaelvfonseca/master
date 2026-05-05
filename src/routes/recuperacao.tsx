import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle, TrendingUp, MessageCircle, Phone, Mail, Bot } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { recoveryData } from "@/lib/mock";

export const Route = createFileRoute("/recuperacao")({
  head: () => ({ meta: [{ title: "Recuperação · Planarius" }] }),
  component: Recovery,
});

const atRisk = [
  { name: "Mariana Silva", course: "Estética Avançada", city: "São Paulo", payment: "Pendente", risk: 78, days: 4 },
  { name: "Carlos Eduardo", course: "Harmonização", city: "Rio de Janeiro", payment: "Pago", risk: 64, days: 2 },
  { name: "Beatriz Rocha", course: "Microblading", city: "BH", payment: "Pendente", risk: 88, days: 6 },
  { name: "Felipe Souza", course: "Lash Designer", city: "Curitiba", payment: "Pago", risk: 52, days: 1 },
  { name: "Juliana Pereira", course: "Podologia", city: "Salvador", payment: "Pendente", risk: 72, days: 3 },
];

function Recovery() {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="Recuperação & Comparecimento"
        description="Automação inteligente que reduz inadimplência e no-show — recuperando alunos antes da turma começar."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Alunos em risco" value={47} delta={-14} icon={AlertTriangle} accent="warning" />
        <StatCard label="Recuperados (mês)" value={132} delta={32} icon={ShieldCheck} accent="success" />
        <StatCard label="Taxa de recuperação" value="74%" delta={9} icon={TrendingUp} accent="success" />
        <StatCard label="Perda evitada" value={brl(312000)} delta={28} icon={ShieldCheck} accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Performance das automações</CardTitle>
            <p className="text-xs text-muted-foreground">Mensagens enviadas, abertas e alunos recuperados por jornada</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={recoveryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent" name="Enviadas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="opened" name="Abertas" fill="var(--color-primary-glow)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="recovered" name="Recuperados" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Fluxos ativos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: MessageCircle, name: "WhatsApp · Lembrete 48h", active: true },
              { icon: Phone, name: "Ligação automatizada IA", active: true },
              { icon: Mail, name: "E-mail confirmação 7d", active: true },
              { icon: Bot, name: "Bot retomada de matrícula", active: true },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-lg border border-border bg-accent/20 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><f.icon className="h-4 w-4" /></div>
                  <span className="text-sm font-medium">{f.name}</span>
                </div>
                <Badge className="bg-success/10 text-success" variant="secondary">Ativo</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Alunos em risco — agir agora</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {atRisk.map((a) => (
            <div key={a.name} className="grid grid-cols-12 items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/30">
              <div className="col-span-3">
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.course}</div>
              </div>
              <div className="col-span-2"><Badge variant="outline">{a.city}</Badge></div>
              <div className="col-span-2"><Badge className={a.payment === "Pago" ? "bg-success/10 text-success" : "bg-warning/15 text-warning"} variant="secondary">{a.payment}</Badge></div>
              <div className="col-span-3">
                <div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Risco no-show</span><span className="font-bold">{a.risk}%</span></div>
                <Progress value={a.risk} className="h-2" />
              </div>
              <div className="col-span-2 text-right text-xs text-muted-foreground">Sem contato há {a.days}d</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
