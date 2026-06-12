import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, GraduationCap, Heart, Megaphone, MousePointer2, Signal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPercent,
  GrowthAccessDenied,
  GrowthDataBar,
  GrowthEmptyPanel,
  GrowthLoading,
  GrowthScopeSelect,
  metricValue,
} from "@/components/growth/GrowthDashboardPrimitives";
import { useAuth } from "@/lib/auth";
import { canViewGrowth, canViewNetworkGrowth } from "@/lib/auth-types";
import { useGrowthData } from "@/lib/use-growth-data";

export const Route = createFileRoute("/branding")({
  head: () => ({ meta: [{ title: "Marketing - Planarius" }] }),
  component: Branding,
});

function Branding() {
  const { session, loading: authLoading } = useAuth();
  const [scopeValue, setScopeValue] = React.useState("");
  const canAccessGrowth = session ? canViewGrowth(session.user.role) : false;
  const canViewNetwork = session ? canViewNetworkGrowth(session.user.role) : false;
  const activeUnitId = session?.activeUnit?.id ?? "";

  React.useEffect(() => {
    if (!session) {
      return;
    }

    setScopeValue((current) => {
      if (!canViewNetwork) {
        return activeUnitId;
      }

      if (current === "all" || session.units.some((unit) => unit.id === current)) {
        return current;
      }

      return "all";
    });
  }, [activeUnitId, canViewNetwork, session]);

  const { data, loading } = useGrowthData(scopeValue, Boolean(canAccessGrowth && scopeValue));
  const isLoading = authLoading || loading;
  const metrics = data?.metrics ?? {
    leadsReceived: 0,
    qualifiedLeads: 0,
    enrollments: 0,
    conversionRate: 0,
    followUpRate: 0,
    averageTicket: 0,
    leadsWithSource: 0,
    sourceConversionRate: 0,
    activeChannels: 0,
    paidChannels: 0,
  };
  const sourceMax = Math.max(...(data?.sources.map((item) => item.leads) ?? [0]), 0);
  const unitMax = Math.max(...(data?.units.map((item) => item.leads) ?? [0]), 0);
  const scopeLabel = data?.scope.label ?? session?.activeUnit?.name ?? "Unidade";

  if (session && !canAccessGrowth) {
    return <GrowthAccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="Marketing e Aquisicao"
        description="Leitura de fontes, canais e conversao de campanhas por unidade ou rede."
        actions={
          session ? (
            <GrowthScopeSelect session={session} value={scopeValue} onValueChange={setScopeValue} />
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Leads com origem"
          value={metricValue(isLoading, metrics.leadsWithSource)}
          icon={MousePointer2}
          accent="primary"
          hint={scopeLabel}
        />
        <StatCard
          label="Conversao por origem"
          value={metricValue(isLoading, formatPercent(metrics.sourceConversionRate))}
          icon={Signal}
          accent="success"
          hint="Matriculas/leads"
        />
        <StatCard
          label="Canais ativos"
          value={metricValue(isLoading, metrics.activeChannels)}
          icon={Megaphone}
          accent="gold"
          hint="Fontes cadastradas"
        />
        <StatCard
          label="Canais pagos"
          value={metricValue(isLoading, metrics.paidChannels)}
          icon={Heart}
          accent="primary"
          hint="Midia paga"
        />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Origem dos leads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GrowthLoading />
          ) : data?.sources.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.sources.map((source) => (
                <GrowthDataBar
                  key={source.source}
                  label={source.source}
                  value={source.leads}
                  max={sourceMax}
                  detail={`${source.enrollments} matriculas - ${formatPercent(source.conversionRate)}`}
                  accent={source.enrollments > 0 ? "success" : "primary"}
                />
              ))}
            </div>
          ) : (
            <GrowthEmptyPanel
              icon={Megaphone}
              title="Nenhuma origem capturada"
              description="As fontes aparecem quando os leads entram com canal de aquisicao."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Matriculas por fonte</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.sources.some((source) => source.enrollments > 0) ? (
              <div className="space-y-4">
                {data.sources
                  .filter((source) => source.enrollments > 0)
                  .map((source) => (
                    <GrowthDataBar
                      key={source.source}
                      label={source.source}
                      value={source.enrollments}
                      max={Math.max(...data.sources.map((item) => item.enrollments), 1)}
                      detail={formatPercent(source.conversionRate)}
                      accent="gold"
                    />
                  ))}
              </div>
            ) : (
              <GrowthEmptyPanel
                icon={GraduationCap}
                title="Sem matriculas por fonte"
                description="As conversoes por origem aparecem quando leads com fonte virarem alunos."
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              {data?.scope.mode === "network" ? "Leads por unidade" : "Leads da unidade"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.scope.mode === "network" && data.units.length ? (
              <div className="space-y-4">
                {data.units.map((unit) => (
                  <GrowthDataBar
                    key={unit.id}
                    label={unit.name}
                    value={unit.leads}
                    max={unitMax}
                    detail={`${unit.enrollments} matriculas`}
                    accent={unit.enrollments > 0 ? "gold" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <GrowthEmptyPanel
                icon={BarChart3}
                title="Visao de unidade ativa"
                description="Use o seletor para alternar entre rede e unidades quando seu perfil permitir."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
