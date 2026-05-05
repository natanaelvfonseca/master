import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Eye, MousePointer2, Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { campaigns } from "@/lib/mock";

export const Route = createFileRoute("/branding")({
  head: () => ({ meta: [{ title: "Branding · Planarius" }] }),
  component: Branding,
});

const lps = [
  { name: "/curso-estetica-sp", visits: 12480, conv: 8.4 },
  { name: "/harmonizacao-rj", visits: 9120, conv: 7.1 },
  { name: "/microblading-bh", visits: 6840, conv: 6.8 },
  { name: "/lash-designer", visits: 5240, conv: 5.9 },
];

function Branding() {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing & Marca"
        title="Branding e Aquisição"
        description="Branding + Performance + Tecnologia. A marca como motor de crescimento."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Impressões" value="2.4M" delta={18} icon={Eye} accent="primary" />
        <StatCard label="Cliques" value="84.2k" delta={12} icon={MousePointer2} accent="primary" />
        <StatCard label="Engajamento" value="6.4%" delta={8} icon={Heart} accent="gold" />
        <StatCard label="Campanhas ativas" value={4} icon={Megaphone} accent="success" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Campanhas em andamento</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.name} className="grid grid-cols-12 items-center gap-3 rounded-lg border border-border p-4 hover:bg-accent/20">
              <div className="col-span-3">
                <div className="text-sm font-semibold">{c.name}</div>
                <Badge variant="outline" className="mt-1 text-[10px]">{c.channel}</Badge>
              </div>
              <div className="col-span-2 text-sm"><span className="text-muted-foreground text-xs">Investido </span><span className="font-semibold">{brl(c.spend)}</span></div>
              <div className="col-span-2 text-sm"><span className="text-muted-foreground text-xs">Leads </span><span className="font-semibold">{c.leads}</span></div>
              <div className="col-span-2 text-sm"><span className="text-muted-foreground text-xs">CPL </span><span className="font-semibold">{brl(c.cpl)}</span></div>
              <div className="col-span-2 text-sm"><span className="text-muted-foreground text-xs">ROI </span><span className="font-bold text-gold">{c.roi}x</span></div>
              <div className="col-span-1 text-right">
                <Badge className={c.status === "Ativa" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"} variant="secondary">{c.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Top landing pages</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lps.map((l) => (
              <div key={l.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{l.name}</span>
                  <span className="font-semibold text-primary">{l.conv}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={l.conv * 10} className="h-2 flex-1" />
                  <span className="w-16 text-right text-xs text-muted-foreground">{l.visits.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card overflow-hidden">
          <div className="bg-gradient-hero p-6 text-primary-foreground">
            <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Percepção de marca</div>
            <div className="mt-1 text-2xl font-bold">NPS 72 <span className="text-gradient-gold">· Excelente</span></div>
            <p className="mt-2 text-sm text-white/70">Sua marca é percebida como autoridade no mercado de cursos profissionalizantes.</p>
          </div>
          <CardContent className="grid grid-cols-3 gap-3 p-5">
            {[
              { label: "Autoridade", value: 89 },
              { label: "Confiança", value: 84 },
              { label: "Inovação", value: 76 },
            ].map((t) => (
              <div key={t.label} className="rounded-lg border border-border bg-accent/30 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{t.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
