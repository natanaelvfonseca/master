import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import type {
  GrowthCityMetric,
  GrowthCourseMetric,
  GrowthFunnelMetric,
  GrowthSourceMetric,
  GrowthUnitMetric,
} from "@/lib/growth-types";
import {
  canViewGrowth,
  canViewNetworkGrowth,
  type AuthSession,
  type UnitSummary,
} from "@/lib/auth-types";
import { ensureCommercialSchema } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

const funnelStages: Array<LeadStage> = [
  "Novo lead",
  "Em contato",
  "Qualificado",
  "Proposta",
  "Pagamento pendente",
  "Confirmado",
  "Recuperação",
  "Matriculado",
];

type GrowthScopeSelection = {
  mode: "network" | "unit";
  label: string;
  unit: UnitSummary | null;
  unitIds: Array<string>;
  availableUnits: Array<UnitSummary>;
};

type SummaryRow = QueryResultRow & {
  leads_received: string | number;
  qualified_leads: string | number;
  enrollments: string | number;
  follow_up_leads: string | number;
  average_ticket: string | number | null;
  leads_with_source: string | number;
  sourced_enrollments: string | number;
};

type ChannelSummaryRow = QueryResultRow & {
  active_channels: string | number;
  paid_channels: string | number;
};

type SourceRow = QueryResultRow & {
  source: string;
  leads: string | number;
  enrollments: string | number;
};

type CourseRow = QueryResultRow & {
  course: string;
  leads: string | number;
  enrollments: string | number;
};

type CityRow = QueryResultRow & {
  city: string;
  leads: string | number;
  enrollments: string | number;
};

type FunnelRow = QueryResultRow & {
  stage: LeadStage;
  leads: string | number;
};

type UnitRow = QueryResultRow & {
  id: string;
  name: string;
  leads: string | number;
  enrollments: string | number;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

function percentage(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function resolveScope(session: AuthSession, request: Request): GrowthScopeSelection | Response {
  if (!canViewGrowth(session.user.role)) {
    return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const canViewNetwork = canViewNetworkGrowth(session.user.role);
  const requestedScope = url.searchParams.get("scope")?.trim();
  const requestedUnitId = url.searchParams.get("unitId")?.trim();
  const availableUnits = session.units;

  if (
    canViewNetwork &&
    (requestedScope === "all" || requestedUnitId === "all" || !requestedUnitId)
  ) {
    return {
      mode: "network",
      label: "Toda rede",
      unit: null,
      unitIds: availableUnits.map((unit) => unit.id),
      availableUnits,
    };
  }

  const selectedUnitId = canViewNetwork ? requestedUnitId : session.activeUnit?.id;
  const unit = availableUnits.find((item) => item.id === selectedUnitId) ?? null;

  if (!unit) {
    return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
  }

  return {
    mode: "unit",
    label: unit.name,
    unit,
    unitIds: [unit.id],
    availableUnits,
  };
}

function mapSources(rows: Array<SourceRow>): Array<GrowthSourceMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);

    return {
      source: row.source,
      leads,
      enrollments,
      conversionRate: percentage(enrollments, leads),
    };
  });
}

function mapCourses(rows: Array<CourseRow>): Array<GrowthCourseMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);

    return {
      course: row.course,
      leads,
      enrollments,
      conversionRate: percentage(enrollments, leads),
    };
  });
}

function mapCities(rows: Array<CityRow>): Array<GrowthCityMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);

    return {
      city: row.city,
      leads,
      enrollments,
      conversionRate: percentage(enrollments, leads),
    };
  });
}

function mapUnits(rows: Array<UnitRow>): Array<GrowthUnitMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);

    return {
      id: row.id,
      name: row.name,
      leads,
      enrollments,
      conversionRate: percentage(enrollments, leads),
    };
  });
}

export const Route = createFileRoute("/api/growth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const scope = resolveScope(session, request);

        if (scope instanceof Response) {
          return scope;
        }

        await ensureCommercialSchema();

        const unitIds = scope.unitIds;

        if (!unitIds.length) {
          return Response.json(
            {
              scope: {
                mode: scope.mode,
                label: scope.label,
                unit: scope.unit,
              },
              availableUnits: scope.availableUnits,
              metrics: {
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
              },
              sources: [],
              courses: [],
              cities: [],
              units: [],
              funnel: funnelStages.map((stage) => ({ stage, leads: 0 })),
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        const [
          summaryResult,
          channelResult,
          sourceResult,
          courseResult,
          cityResult,
          funnelResult,
          unitResult,
        ] = await Promise.all([
          queryDb<SummaryRow>(
            `
                select
                  count(*) as leads_received,
                  count(*) filter (
                    where stage in (
                      'Qualificado',
                      'Proposta',
                      'Pagamento pendente',
                      'Confirmado',
                      'Matriculado'
                    )
                  ) as qualified_leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments,
                  count(*) filter (
                    where follow_up_count > 0
                      or first_contact_at is not null
                      or stage <> 'Novo lead'
                  ) as follow_up_leads,
                  avg(course_value_snapshot) filter (where stage = 'Matriculado') as average_ticket,
                  count(*) filter (where nullif(acquisition_channel_name_snapshot, '') is not null) as leads_with_source,
                  count(*) filter (
                    where stage = 'Matriculado'
                      and nullif(acquisition_channel_name_snapshot, '') is not null
                  ) as sourced_enrollments
                from app_leads
                where unit_id = any($1::uuid[])
              `,
            [unitIds],
          ),
          queryDb<ChannelSummaryRow>(
            `
                select
                  count(*) filter (where status = 'active') as active_channels,
                  count(*) filter (where status = 'active' and lower(type) like '%pago%') as paid_channels
                from app_acquisition_channels
                where unit_id = any($1::uuid[])
              `,
            [unitIds],
          ),
          queryDb<SourceRow>(
            `
                select
                  coalesce(nullif(acquisition_channel_name_snapshot, ''), 'Sem origem') as source,
                  count(*) as leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments
                from app_leads
                where unit_id = any($1::uuid[])
                group by 1
                order by count(*) desc, source asc
                limit 8
              `,
            [unitIds],
          ),
          queryDb<CourseRow>(
            `
                select
                  coalesce(nullif(course_name_snapshot, ''), 'Sem curso') as course,
                  count(*) as leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments
                from app_leads
                where unit_id = any($1::uuid[])
                group by 1
                order by count(*) filter (where stage = 'Matriculado') desc, count(*) desc, course asc
                limit 8
              `,
            [unitIds],
          ),
          queryDb<CityRow>(
            `
                select
                  nullif(city, '') as city,
                  count(*) as leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments
                from app_leads
                where unit_id = any($1::uuid[])
                  and nullif(city, '') is not null
                group by nullif(city, '')
                order by count(*) desc, city asc
                limit 8
              `,
            [unitIds],
          ),
          queryDb<FunnelRow>(
            `
                select stage, count(*) as leads
                from app_leads
                where unit_id = any($1::uuid[])
                group by stage
              `,
            [unitIds],
          ),
          queryDb<UnitRow>(
            `
                select
                  u.id,
                  u.name,
                  count(l.id) as leads,
                  count(l.id) filter (where l.stage = 'Matriculado') as enrollments
                from unnest($1::uuid[]) with ordinality as selected(unit_id, ord)
                inner join app_units u on u.id = selected.unit_id
                left join app_leads l on l.unit_id = u.id
                group by u.id, u.name, selected.ord
                order by selected.ord
              `,
            [unitIds],
          ),
        ]);

        const summary = summaryResult.rows[0];
        const channelSummary = channelResult.rows[0];
        const leadsReceived = toNumber(summary?.leads_received);
        const qualifiedLeads = toNumber(summary?.qualified_leads);
        const enrollments = toNumber(summary?.enrollments);
        const followUpLeads = toNumber(summary?.follow_up_leads);
        const leadsWithSource = toNumber(summary?.leads_with_source);
        const sourcedEnrollments = toNumber(summary?.sourced_enrollments);
        const funnelCounts = new Map(
          funnelResult.rows.map((row) => [row.stage, toNumber(row.leads)] as const),
        );
        const unitMetrics = mapUnits(unitResult.rows);

        return Response.json(
          {
            scope: {
              mode: scope.mode,
              label: scope.label,
              unit: scope.unit,
            },
            availableUnits: scope.availableUnits,
            metrics: {
              leadsReceived,
              qualifiedLeads,
              enrollments,
              conversionRate: percentage(enrollments, leadsReceived),
              followUpRate: percentage(followUpLeads, leadsReceived),
              averageTicket: toNumber(summary?.average_ticket),
              leadsWithSource,
              sourceConversionRate: percentage(sourcedEnrollments, leadsWithSource),
              activeChannels: toNumber(channelSummary?.active_channels),
              paidChannels: toNumber(channelSummary?.paid_channels),
            },
            sources: mapSources(sourceResult.rows),
            courses: mapCourses(courseResult.rows),
            cities: mapCities(cityResult.rows),
            units: scope.mode === "network" ? unitMetrics : [],
            funnel: funnelStages.map<GrowthFunnelMetric>((stage) => ({
              stage,
              leads: funnelCounts.get(stage) ?? 0,
            })),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
