import { createFileRoute } from "@tanstack/react-router";
import { Eye, Heart, Megaphone, MousePointer2, PanelsTopLeft, Signal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/branding")({
  head: () => ({ meta: [{ title: "Branding · Planarius" }] }),
  component: Branding,
});

function Branding() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing & Marca"
        title="Branding e Aquisição"
        description="Branding + Performance + Tecnologia. A marca como motor de crescimento."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Impressões" value={0} icon={Eye} accent="primary" />
        <StatCard label="Cliques" value={0} icon={MousePointer2} accent="primary" />
        <StatCard label="Engajamento" value="0%" icon={Heart} accent="gold" />
        <StatCard label="Campanhas ativas" value={0} icon={Megaphone} accent="success" />
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Campanhas em andamento</CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={Megaphone}
            title="Nenhuma campanha cadastrada"
            description="As campanhas reais aparecerão quando os canais de mídia forem conectados."
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Landing pages</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={PanelsTopLeft}
              title="Nenhuma landing page monitorada"
              description="Visitas e conversões serão exibidas após integração das páginas reais."
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Percepção de marca</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              icon={Signal}
              title="Sem medição de marca"
              description="Indicadores de autoridade, confiança e inovação serão exibidos com dados reais."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
