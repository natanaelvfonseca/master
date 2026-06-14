import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { RankingMember, RankingResponse } from "@/lib/ranking-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import { ensureCommercialSchema, getUnitFromRequest } from "@/lib/server/commercial-schema";
import { queryDb } from "@/lib/server/db";

type RankingRow = QueryResultRow & {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  leads: string | number;
  taxa_feita: string | number;
  last_taxa_at: string | null;
};

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0) || 0;
}

function percentage(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function mapRankingRow(row: RankingRow, index: number): RankingMember {
  const leads = toNumber(row.leads);
  const taxaFeita = toNumber(row.taxa_feita);

  return {
    rank: index + 1,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    leads,
    taxaFeita,
    conversionRate: percentage(taxaFeita, leads),
    lastTaxaAt: row.last_taxa_at,
  };
}

export const Route = createFileRoute("/api/ranking")({
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

        const result = await queryDb<RankingRow>(
          `
            with consultants as (
              select distinct
                u.id,
                u.name,
                u.email,
                u.avatar_url
              from app_users u
              left join app_user_units uu on uu.user_id = u.id and uu.unit_id = $1
              where u.status = 'active'
                and u.role = 'CONSULTOR'
                and (u.primary_unit_id = $1 or uu.unit_id is not null)
            ),
            lead_metrics as (
              select
                l.created_by as user_id,
                count(*)::int as leads
              from app_leads l
              where l.unit_id = $1
                and l.created_by is not null
              group by l.created_by
            ),
            taxa_metrics as (
              select
                coalesce(l.converted_by, l.created_by) as user_id,
                count(*)::int as taxa_feita,
                max(coalesce(l.payment_confirmed_at, l.converted_at, l.updated_at, l.created_at))::text as last_taxa_at
              from app_leads l
              where l.unit_id = $1
                and l.stage = 'Matriculado'
                and l.payment_status = 'paid'
                and coalesce(l.converted_by, l.created_by) is not null
              group by coalesce(l.converted_by, l.created_by)
            )
            select
              c.id as user_id,
              c.name,
              c.email,
              c.avatar_url,
              coalesce(lm.leads, 0)::int as leads,
              coalesce(tm.taxa_feita, 0)::int as taxa_feita,
              tm.last_taxa_at
            from consultants c
            left join lead_metrics lm on lm.user_id = c.id
            left join taxa_metrics tm on tm.user_id = c.id
            order by
              coalesce(tm.taxa_feita, 0) desc,
              coalesce(lm.leads, 0) desc,
              c.name asc
          `,
          [unit.id],
        );

        const ranking = result.rows.map(mapRankingRow);
        const totals = ranking.reduce(
          (acc, member) => ({
            consultants: acc.consultants + 1,
            leads: acc.leads + member.leads,
            taxaFeita: acc.taxaFeita + member.taxaFeita,
          }),
          { consultants: 0, leads: 0, taxaFeita: 0 },
        );

        const response: RankingResponse = {
          unit,
          ranking,
          totals,
        };

        return Response.json(response, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
