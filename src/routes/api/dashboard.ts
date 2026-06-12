import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import { ensureCommercialSchema, getUnitFromRequest } from "@/lib/server/commercial-schema";
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

type SummaryRow = QueryResultRow & {
  leads_received: string | number;
  qualified_leads: string | number;
  enrollments: string | number;
  follow_up_leads: string | number;
  average_ticket: string | number | null;
  revenue: string | number | null;
};

type SourceRow = QueryResultRow & {
  source: string;
  leads: string | number;
  enrollments: string | number;
  revenue: string | number | null;
};

type FunnelRow = QueryResultRow & {
  stage: LeadStage;
  leads: string | number;
};

type CityRow = QueryResultRow & {
  city: string;
  leads: string | number;
  enrollments: string | number;
};

type RevenueMonthRow = QueryResultRow & {
  month: string;
  revenue: string | number | null;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

function percentage(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

export const Route = createFileRoute("/api/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const unit = getUnitFromRequest(session, request);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        await ensureCommercialSchema();

        const params = [unit.id, session.user.id] as const;

        const [summaryResult, sourceResult, funnelResult, cityResult, revenueResult] =
          await Promise.all([
            queryDb<SummaryRow>(
              `
                with scoped_leads as (
                  select *
                  from app_leads
                  where unit_id = $1
                    and created_by = $2
                ),
                lead_metrics as (
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
                    avg(course_value_snapshot) filter (where stage = 'Matriculado') as average_ticket
                  from scoped_leads
                ),
                payment_metrics as (
                  select
                    coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as paid_revenue
                  from app_student_payments p
                  inner join scoped_leads l on l.id = p.lead_id
                  where p.unit_id = $1
                ),
                lead_revenue_fallback as (
                  select coalesce(sum(coalesce(l.course_value_snapshot, 0)), 0) as fallback_revenue
                  from scoped_leads l
                  where l.stage = 'Matriculado'
                    and not exists (
                      select 1
                      from app_student_payments p
                      where p.lead_id = l.id
                        and p.status = 'paid'
                    )
                )
                select
                  lm.leads_received,
                  lm.qualified_leads,
                  lm.enrollments,
                  lm.follow_up_leads,
                  lm.average_ticket,
                  coalesce(pm.paid_revenue, 0) + coalesce(lrf.fallback_revenue, 0) as revenue
                from lead_metrics lm
                cross join payment_metrics pm
                cross join lead_revenue_fallback lrf
              `,
              params,
            ),
            queryDb<SourceRow>(
              `
                select
                  coalesce(nullif(acquisition_channel_name_snapshot, ''), 'Sem origem') as source,
                  count(*) as leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments,
                  coalesce(sum(course_value_snapshot) filter (where stage = 'Matriculado'), 0) as revenue
                from app_leads
                where unit_id = $1
                  and created_by = $2
                group by 1
                order by count(*) desc, source asc
                limit 6
              `,
              params,
            ),
            queryDb<FunnelRow>(
              `
                select stage, count(*) as leads
                from app_leads
                where unit_id = $1
                  and created_by = $2
                group by stage
              `,
              params,
            ),
            queryDb<CityRow>(
              `
                select
                  nullif(city, '') as city,
                  count(*) as leads,
                  count(*) filter (where stage = 'Matriculado') as enrollments
                from app_leads
                where unit_id = $1
                  and created_by = $2
                  and nullif(city, '') is not null
                group by nullif(city, '')
                order by count(*) desc, city asc
                limit 6
              `,
              params,
            ),
            queryDb<RevenueMonthRow>(
              `
                with scoped_leads as (
                  select *
                  from app_leads
                  where unit_id = $1
                    and created_by = $2
                ),
                revenue_events as (
                  select coalesce(p.paid_at, p.created_at) as event_at, p.amount
                  from app_student_payments p
                  inner join scoped_leads l on l.id = p.lead_id
                  where p.unit_id = $1
                    and p.status = 'paid'
                  union all
                  select
                    coalesce(l.payment_confirmed_at, l.converted_at, l.updated_at, l.created_at) as event_at,
                    coalesce(l.course_value_snapshot, 0) as amount
                  from scoped_leads l
                  where l.stage = 'Matriculado'
                    and not exists (
                      select 1
                      from app_student_payments p
                      where p.lead_id = l.id
                        and p.status = 'paid'
                    )
                )
                select
                  to_char(date_trunc('month', event_at), 'YYYY-MM') as month,
                  sum(amount) as revenue
                from revenue_events
                group by date_trunc('month', event_at)
                order by date_trunc('month', event_at) desc
                limit 6
              `,
              params,
            ),
          ]);

        const summary = summaryResult.rows[0];
        const leadsReceived = toNumber(summary?.leads_received);
        const qualifiedLeads = toNumber(summary?.qualified_leads);
        const enrollments = toNumber(summary?.enrollments);
        const followUpLeads = toNumber(summary?.follow_up_leads);

        const funnelCounts = new Map(
          funnelResult.rows.map((row) => [row.stage, toNumber(row.leads)] as const),
        );

        return Response.json(
          {
            unit,
            metrics: {
              leadsReceived,
              qualifiedLeads,
              enrollments,
              conversionRate: percentage(enrollments, leadsReceived),
              followUpRate: percentage(followUpLeads, leadsReceived),
              averageTicket: toNumber(summary?.average_ticket),
              revenue: toNumber(summary?.revenue),
            },
            sources: sourceResult.rows.map((row) => ({
              source: row.source,
              leads: toNumber(row.leads),
              enrollments: toNumber(row.enrollments),
              revenue: toNumber(row.revenue),
            })),
            funnel: funnelStages.map((stage) => ({
              stage,
              leads: funnelCounts.get(stage) ?? 0,
            })),
            cities: cityResult.rows.map((row) => ({
              city: row.city,
              leads: toNumber(row.leads),
              enrollments: toNumber(row.enrollments),
            })),
            revenueByMonth: revenueResult.rows.reverse().map((row) => ({
              month: row.month,
              revenue: toNumber(row.revenue),
            })),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
