import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, Download } from "lucide-react";
import { cityData, courses } from "@/lib/mock";

export const Route = createFileRoute("/bi")({
  head: () => ({ meta: [{ title: "BI Comercial · Planarius" }] }),
  component: BI,
});

const closeTime = [
  { m: "Jan", days: 14 }, { m: "Fev", days: 12 }, { m: "Mar", days: 11 },
  { m: "Abr", days: 9 }, { m: "Mai", days: 8 }, { m: "Jun", days: 7 },
];

const courseData = courses.map((c, i) => ({
  course: c, conv: 14 + i * 2, ticket: 1100 + i * 180, attendance: 82 + i * 2,
}));

const radarData = [
  { metric: "Captação", A: 92 }, { metric: "Qualificação", A: 78 },
  { metric: "Conversão", A: 84 }, { metric: "Follow-up", A: 71 },
  { metric: "Comparec.", A: 88 }, { metric: "Recuperação", A: 81 },
];

function BI() {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inteligência"
        title="BI & Métricas Comerciais"
        description="Análise multidimensional por vendedor, origem, cidade, curso e campanha."
        actions={
          <>
            <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtros</Button>
            <Button className="bg-gradient-primary"><Download className="mr-2 h-4 w-4" />Exportar</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Conversão por cidade</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="city" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="leads" name="Leads" fill="var(--color-primary-glow)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="conv" name="Conv. %" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Maturidade comercial</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="var(--color-border)" />
                <Radar dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Performance por curso</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 text-left">Curso</th>
                    <th className="text-center">Conv. %</th>
                    <th className="text-right">Ticket médio</th>
                    <th className="text-center">Comparecimento</th>
                  </tr>
                </thead>
                <tbody>
                  {courseData.map((c) => (
                    <tr key={c.course} className="border-b border-border last:border-0 hover:bg-accent/30">
                      <td className="py-3 font-medium">{c.course}</td>
                      <td className="text-center"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{c.conv}%</span></td>
                      <td className="text-right font-semibold">{brl(c.ticket)}</td>
                      <td className="text-center"><span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">{c.attendance}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Tempo médio de fechamento</CardTitle>
            <p className="text-xs text-muted-foreground">Em dias</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={closeTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="days" stroke="var(--color-gold)" strokeWidth={3} dot={{ fill: "var(--color-gold)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
