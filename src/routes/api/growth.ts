import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import type {
  GrowthCampaignMetric,
  GrowthCityMetric,
  GrowthConsultantMetric,
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
import { ensureMetaLeadSchema } from "@/lib/server/meta-leads";

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
  mode: "network" | "unit" | "individual";
  label: string;
  unit: UnitSummary | null;
  unitIds: Array<string>;
  consultantId: string | null;
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
  revenue: string | number | null;
  average_first_contact_hours: string | number | null;
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

type TrendRow = QueryResultRow & {
  date: string;
  leads: string | number;
  enrollments: string | number;
};

type CampaignRow = QueryResultRow & {
  campaign: string;
  leads: string | number;
  enrollments: string | number;
};

type ConsultantRow = QueryResultRow & {
  id: string;
  name: string;
  leads: string | number;
  qualified_leads: string | number;
  enrollments: string | number;
  follow_up_leads: string | number;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

function percentage(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function readPeriod(request: Request) {
  const requested = Number.parseInt(new URL(request.url).searchParams.get("period") ?? "30", 10);

  return [7, 30, 90, 365].includes(requested) ? requested : 30;
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
      consultantId: null,
      availableUnits,
    };
  }

  const selectedUnitId = canViewNetwork ? requestedUnitId : session.activeUnit?.id;
  const unit = availableUnits.find((item) => item.id === selectedUnitId) ?? null;

  if (!unit) {
    return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
  }

  const individual = session.user.role === "CONSULTOR";

  return {
    mode: individual ? "individual" : "unit",
    label: individual ? `Minha performance · ${unit.name}` : unit.name,
    unit,
    unitIds: [unit.id],
    consultantId: individual ? session.user.id : null,
    availableUnits,
  };
}

function mapSources(rows: Array<SourceRow>): Array<GrowthSourceMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);
    return { source: row.source, leads, enrollments, conversionRate: percentage(enrollments, leads) };
  });
}

function mapCourses(rows: Array<CourseRow>): Array<GrowthCourseMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);
    return { course: row.course, leads, enrollments, conversionRate: percentage(enrollments, leads) };
  });
}

function mapCities(rows: Array<CityRow>): Array<GrowthCityMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);
    return { city: row.city, leads, enrollments, conversionRate: percentage(enrollments, leads) };
  });
}

function mapUnits(rows: Array<UnitRow>): Array<GrowthUnitMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);
    return { id: row.id, name: row.name, leads, enrollments, conversionRate: percentage(enrollments, leads) };
  });
}

function mapCampaigns(rows: Array<CampaignRow>): Array<GrowthCampaignMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const enrollments = toNumber(row.enrollments);
    return { campaign: row.campaign, leads, enrollments, conversionRate: percentage(enrollments, leads) };
  });
}

function mapConsultants(rows: Array<ConsultantRow>): Array<GrowthConsultantMetric> {
  return rows.map((row) => {
    const leads = toNumber(row.leads);
    const qualifiedLeads = toNumber(row.qualified_leads);
    const enrollments = toNumber(row.enrollments);
    const followUpLeads = toNumber(row.follow_up_leads);
    return {
      id: row.id,
      name: row.name,
      leads,
      qualifiedLeads,
      enrollments,
      conversionRate: percentage(enrollments, leads),
      followUpRate: percentage(followUpLeads, leads),
    };
  });
}

function emptyResponse(scope: GrowthScopeSelection) {
  return {
    scope: { mode: scope.mode, label: scope.label, unit: scope.unit },
    availableUnits: scope.availableUnits,
    periodDays: 30,
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
      revenue: 0,
      metaLeads: 0,
      campaignCount: 0,
      averageFirstContactHours: 0,
    },
    sources: [],
    courses: [],
    cities: [],
    units: [],
    funnel: funnelStages.map((stage) => ({ stage, leads: 0 })),
    trend: [],
    campaigns: [],
    consultants: [],
  };
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

        if (!scope.unitIds.length) {
          return Response.json(emptyResponse(scope), { headers: { "Cache-Control": "no-store" } });
        }

        await Promise.all([ensureCommercialSchema(), ensureMetaLeadSchema()]);

        const periodDays = readPeriod(request);
        const params = [scope.unitIds, scope.consultantId, periodDays] as const;
        const scopedWhere = `
          unit_id = any($1::uuid[])
          and ($2::uuid is null or created_by = $2)
          and created_at >= current_date - make_interval(days => $3::int)
        `;

        const [
          summaryResult,
          channelResult,
          sourceResult,
          courseResult,
          cityResult,
          funnelResult,
          unitResult,
          trendResult,
          campaignResult,
          consultantResult,
          metaSummaryResult,
        ] = await Promise.all([
          queryDb<SummaryRow>(
            `
              select
                count(*) as leads_received,
                count(*) filter (where stage in ('Qualificado','Proposta','Pagamento pendente','Confirmado','Matriculado')) as qualified_leads,
                count(*) filter (where stage = 'Matriculado') as enrollments,
                count(*) filter (where follow_up_count > 0 or first_contact_at is not null or stage <> 'Novo lead') as follow_up_leads,
                avg(course_value_snapshot) filter (where stage = 'Matriculado') as average_ticket,
                count(*) filter (where nullif(acquisition_channel_name_snapshot, '') is not null) as leads_with_source,
                count(*) filter (where stage = 'Matriculado' and nullif(acquisition_channel_name_snapshot, '') is not null) as sourced_enrollments,
                coalesce(sum(course_value_snapshot) filter (where stage = 'Matriculado'), 0) as revenue,
                avg(extract(epoch from (first_contact_at - created_at)) / 3600) filter (where first_contact_at is not null) as average_first_contact_hours
              from app_leads
              where ${scopedWhere}
            `,
            params,
          ),
          queryDb<ChannelSummaryRow>(
            `
              select
                count(*) filter (where status = 'active') as active_channels,
                count(*) filter (where status = 'active' and lower(type) like '%pago%') as paid_channels
              from app_acquisition_channels
              where unit_id = any($1::uuid[])
            `,
            [scope.unitIds],
          ),
          queryDb<SourceRow>(
            `
              select coalesce(nullif(acquisition_channel_name_snapshot, ''), 'Sem origem') as source,
                     count(*) as leads,
                     count(*) filter (where stage = 'Matriculado') as enrollments
              from app_leads
              where ${scopedWhere}
              group by 1
              order by count(*) desc, source asc
              limit 10
            `,
            params,
          ),
          queryDb<CourseRow>(
            `
              select coalesce(nullif(course_name_snapshot, ''), 'Sem curso') as course,
                     count(*) as leads,
                     count(*) filter (where stage = 'Matriculado') as enrollments
              from app_leads
              where ${scopedWhere}
              group by 1
              order by count(*) filter (where stage = 'Matriculado') desc, count(*) desc
              limit 10
            `,
            params,
          ),
          queryDb<CityRow>(
            `
              select nullif(city, '') as city,
                     count(*) as leads,
                     count(*) filter (where stage = 'Matriculado') as enrollments
              from app_leads
              where ${scopedWhere} and nullif(city, '') is not null
              group by 1
              order by count(*) desc, city asc
              limit 10
            `,
            params,
          ),
          queryDb<FunnelRow>(
            `select stage, count(*) as leads from app_leads where ${scopedWhere} group by stage`,
            params,
          ),
          queryDb<UnitRow>(
            `
              select u.id, u.name,
                     count(l.id) as leads,
                     count(l.id) filter (where l.stage = 'Matriculado') as enrollments
              from unnest($1::uuid[]) with ordinality as selected(unit_id, ord)
              join app_units u on u.id = selected.unit_id
              left join app_leads l on l.unit_id = u.id
                and ($2::uuid is null or l.created_by = $2)
                and l.created_at >= current_date - make_interval(days => $3::int)
              group by u.id, u.name, selected.ord
              order by selected.ord
            `,
            params,
          ),
          queryDb<TrendRow>(
            `
              with days as (
                select generate_series(
                  current_date - make_interval(days => $3::int) + interval '1 day',
                  current_date,
                  interval '1 day'
                )::date as day
              ),
              totals as (
                select created_at::date as day,
                       count(*) as leads,
                       count(*) filter (where stage = 'Matriculado') as enrollments
                from app_leads
                where ${scopedWhere}
                group by created_at::date
              )
              select to_char(days.day, 'YYYY-MM-DD') as date,
                     coalesce(totals.leads, 0) as leads,
                     coalesce(totals.enrollments, 0) as enrollments
              from days left join totals on totals.day = days.day
              order by days.day
            `,
            params,
          ),
          queryDb<CampaignRow>(
            `
              select coalesce(nullif(e.campaign_name, ''), 'Campanha sem nome') as campaign,
                     count(*) as leads,
                     count(*) filter (where l.stage = 'Matriculado') as enrollments
              from app_meta_lead_events e
              join app_leads l on l.id = e.lead_id
              where l.unit_id = any($1::uuid[])
                and ($2::uuid is null or l.created_by = $2)
                and l.created_at >= current_date - make_interval(days => $3::int)
              group by 1
              order by count(*) desc
              limit 12
            `,
            params,
          ),
          queryDb<ConsultantRow>(
            `
              select u.id, u.name,
                     count(l.id) as leads,
                     count(l.id) filter (where l.stage in ('Qualificado','Proposta','Pagamento pendente','Confirmado','Matriculado')) as qualified_leads,
                     count(l.id) filter (where l.stage = 'Matriculado') as enrollments,
                     count(l.id) filter (where l.follow_up_count > 0 or l.first_contact_at is not null or l.stage <> 'Novo lead') as follow_up_leads
              from app_users u
              join app_user_units uu on uu.user_id = u.id and uu.unit_id = any($1::uuid[])
              left join app_leads l on l.created_by = u.id
                and l.unit_id = uu.unit_id
                and l.created_at >= current_date - make_interval(days => $3::int)
              where u.role = 'CONSULTOR' and u.status = 'active'
                and ($2::uuid is null or u.id = $2)
              group by u.id, u.name
              order by count(l.id) filter (where l.stage = 'Matriculado') desc, count(l.id) desc
            `,
            params,
          ),
          queryDb<{ meta_leads: string | number; campaign_count: string | number } & QueryResultRow>(
            `
              select count(*) as meta_leads,
                     count(distinct nullif(e.campaign_id, '')) as campaign_count
              from app_meta_lead_events e
              join app_leads l on l.id = e.lead_id
              where l.unit_id = any($1::uuid[])
                and ($2::uuid is null or l.created_by = $2)
                and l.created_at >= current_date - make_interval(days => $3::int)
            `,
            params,
          ),
        ]);

        const summary = summaryResult.rows[0];
        const channelSummary = channelResult.rows[0];
        const metaSummary = metaSummaryResult.rows[0];
        const leadsReceived = toNumber(summary?.leads_received);
        const enrollments = toNumber(summary?.enrollments);
        const leadsWithSource = toNumber(summary?.leads_with_source);
        const funnelCounts = new Map(
          funnelResult.rows.map((row) => [row.stage, toNumber(row.leads)] as const),
        );

        return Response.json(
          {
            scope: { mode: scope.mode, label: scope.label, unit: scope.unit },
            availableUnits: scope.availableUnits,
            periodDays,
            metrics: {
              leadsReceived,
              qualifiedLeads: toNumber(summary?.qualified_leads),
              enrollments,
              conversionRate: percentage(enrollments, leadsReceived),
              followUpRate: percentage(toNumber(summary?.follow_up_leads), leadsReceived),
              averageTicket: toNumber(summary?.average_ticket),
              leadsWithSource,
              sourceConversionRate: percentage(toNumber(summary?.sourced_enrollments), leadsWithSource),
              activeChannels: toNumber(channelSummary?.active_channels),
              paidChannels: toNumber(channelSummary?.paid_channels),
              revenue: toNumber(summary?.revenue),
              metaLeads: toNumber(metaSummary?.meta_leads),
              campaignCount: toNumber(metaSummary?.campaign_count),
              averageFirstContactHours: toNumber(summary?.average_first_contact_hours),
            },
            sources: mapSources(sourceResult.rows),
            courses: mapCourses(courseResult.rows),
            cities: mapCities(cityResult.rows),
            units: scope.mode === "network" ? mapUnits(unitResult.rows) : [],
            funnel: funnelStages.map<GrowthFunnelMetric>((stage) => ({
              stage,
              leads: funnelCounts.get(stage) ?? 0,
            })),
            trend: trendResult.rows.map((row) => ({
              date: row.date,
              leads: toNumber(row.leads),
              enrollments: toNumber(row.enrollments),
            })),
            campaigns: mapCampaigns(campaignResult.rows),
            consultants: mapConsultants(consultantResult.rows),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
