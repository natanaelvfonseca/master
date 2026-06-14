import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  GraduationCap,
  LineChart,
  Phone,
  Radar,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
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

export const Route = createFileRoute("/bi")({
  head: () => ({ meta: [{ title: "BI Comercial - Planarius" }] }),
  component: BI,
});

function BI() {
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
  const scopeLabel = data?.scope.label ?? session?.activeUnit?.name ?? "Unidade";
  const courseMax = Math.max(...(data?.courses.map((item) => item.leads) ?? [0]), 0);
  const cityMax = Math.max(...(data?.cities.map((item) => item.leads) ?? [0]), 0);
  const funnelMax = Math.max(...(data?.funnel.map((item) => item.leads) ?? [0]), 0);
  const unitMax = Math.max(...(data?.units.map((item) => item.leads) ?? [0]), 0);

  if (session && !canAccessGrowth) {
    return <GrowthAccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crescimento"
        title="BI Comercial"
        description="Indicadores comerciais consolidados por unidade, curso, cidade e estágio do funil."
        actions={
          session ? (
            <GrowthScopeSelect session={session} value={scopeValue} onValueChange={setScopeValue} />
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Leads"
          value={metricValue(isLoading, metrics.leadsReceived)}
          icon={Users}
          accent="primary"
          hint={scopeLabel}
        />
        <StatCard
          label="Qualificados"
          value={metricValue(isLoading, metrics.qualifiedLeads)}
          icon={UserCheck}
          accent="primary"
          hint="Funil avançado"
        />
        <StatCard
          label="Matrículas"
          value={metricValue(isLoading, metrics.enrollments)}
          icon={GraduationCap}
          accent="gold"
          hint="Taxa feita"
        />
        <StatCard
          label="Conversão"
          value={metricValue(isLoading, formatPercent(metrics.conversionRate))}
          icon={LineChart}
          accent="success"
          hint="Matrículas/leads"
        />
        <StatCard
          label="Follow-up"
          value={metricValue(isLoading, formatPercent(metrics.followUpRate))}
          icon={Phone}
          accent="primary"
          hint="Leads acionados"
        />
        <StatCard
          label="Ticket médio"
          value={metricValue(isLoading, formatCurrency(metrics.averageTicket))}
          icon={Target}
          accent="primary"
          hint="Alunos"
        />
      </div>

      {data?.scope.mode === "network" ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Performance por unidade</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data.units.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.units.map((unit) => (
                  <GrowthDataBar
                    key={unit.id}
                    label={unit.name}
                    value={unit.leads}
                    max={unitMax}
                    detail={`${unit.enrollments} matrículas - ${formatPercent(unit.conversionRate)}`}
                    accent={unit.enrollments > 0 ? "gold" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <GrowthEmptyPanel
                icon={BarChart3}
                title="Sem dados por unidade"
                description="As unidades aparecem aqui quando houver leads no CRM."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Performance por curso</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.courses.length ? (
              <div className="space-y-4">
                {data.courses.map((course) => (
                  <GrowthDataBar
                    key={course.course}
                    label={course.course}
                    value={course.leads}
                    max={courseMax}
                    detail={`${course.enrollments} matrículas - ${formatPercent(course.conversionRate)}`}
                    accent={course.enrollments > 0 ? "success" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <GrowthEmptyPanel
                icon={BarChart3}
                title="Sem cursos com performance"
                description="Os cursos aparecem quando os leads e matrículas tiverem curso vinculado."
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Funil comercial</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <GrowthLoading />
            ) : data?.funnel.some((item) => item.leads > 0) ? (
              <div className="space-y-4">
                {data.funnel.map((item) => (
                  <GrowthDataBar
                    key={item.stage}
                    label={item.stage}
                    value={item.leads}
                    max={funnelMax}
                    detail={`${item.leads} leads`}
                    accent={item.stage === "Matriculado" ? "gold" : "primary"}
                  />
                ))}
              </div>
            ) : (
              <GrowthEmptyPanel
                icon={Radar}
                title="Sem movimento no funil"
                description="Os estágios serão preenchidos quando existirem leads na unidade."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Conversão por cidade</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <GrowthLoading />
          ) : data?.cities.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.cities.map((city) => (
                <GrowthDataBar
                  key={city.city}
                  label={city.city}
                  value={city.leads}
                  max={cityMax}
                  detail={`${city.enrollments} matrículas - ${formatPercent(city.conversionRate)}`}
                  accent="success"
                />
              ))}
            </div>
          ) : (
            <GrowthEmptyPanel
              icon={BarChart3}
              title="Sem dados de cidade"
              description="A conversão por cidade aparece quando os leads tiverem cidade cadastrada."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
