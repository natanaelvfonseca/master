import { randomInt } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import { isDevRole } from "@/lib/auth-types";
import { ensureCommercialSchema, getUnitFromBody, getUnitFromRequest, isUuid } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb, withTransaction } from "@/lib/server/db";

type ConsultantRow = QueryResultRow & { id: string; name: string; email: string };
type ImportRow = {
  fullName: string;
  phone: string;
  phone2: string;
  campaignName: string;
  formId: string;
  observations: string;
};

const MAX_IMPORT_ROWS = 2_000;

async function ensureLeadImportSchema() {
  await queryDb(`
    create table if not exists app_lead_import_rows (
      id uuid primary key default gen_random_uuid(),
      lead_id uuid not null unique references app_leads(id) on delete cascade,
      campaign_name text,
      form_id text,
      whatsapp_number text,
      imported_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now()
    );
    create index if not exists app_lead_import_rows_campaign_idx on app_lead_import_rows (campaign_name);
  `);
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function parseRows(value: unknown): Array<ImportRow> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_IMPORT_ROWS).map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      fullName: clean(row.fullName, 250),
      phone: clean(row.phone, 80),
      phone2: clean(row.phone2, 80),
      campaignName: clean(row.campaignName, 500),
      formId: clean(row.formId, 200),
      observations: clean(row.observations, 2_000),
    };
  });
}

async function listConsultants(unitId: string) {
  const result = await queryDb<ConsultantRow>(`
    select distinct u.id, u.name, u.email
    from app_users u
    left join app_user_units uu on uu.user_id = u.id and uu.unit_id = $1
    where u.status = 'active'
      and u.role = 'CONSULTOR'
      and (u.primary_unit_id = $1 or uu.user_id is not null)
    order by u.name
  `, [unitId]);
  return result.rows;
}

export const Route = createFileRoute("/api/crm/import")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!isDevRole(session.user.role)) return Response.json({ error: "Acesso exclusivo para DEV." }, { status: 403 });
        const unit = getUnitFromRequest(session, request);
        if (!unit) return Response.json({ error: "Unidade indisponível." }, { status: 403 });
        await ensureCommercialSchema();
        await ensureLeadImportSchema();
        return Response.json({ consultants: await listConsultants(unit.id) }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!isDevRole(session.user.role)) return Response.json({ error: "Acesso exclusivo para DEV." }, { status: 403 });

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const unit = getUnitFromBody(session, body?.unitId);
        if (!unit) return Response.json({ error: "Unidade indisponível." }, { status: 403 });
        const rows = parseRows(body?.rows);
        const consultantIds = Array.isArray(body?.consultantIds)
          ? Array.from(new Set(body.consultantIds.filter((id): id is string => typeof id === "string" && isUuid(id))))
          : [];
        const skipDuplicates = body?.skipDuplicates !== false;

        if (!rows.length) return Response.json({ error: "Nenhuma linha para importar." }, { status: 400 });
        if (!consultantIds.length) return Response.json({ error: "Selecione ao menos um consultor." }, { status: 400 });
        const invalidRows = rows.filter((row) => !row.fullName || !normalizePhone(row.phone));
        if (invalidRows.length) return Response.json({ error: `${invalidRows.length} linha(s) sem nome ou telefone válido.` }, { status: 400 });

        await ensureCommercialSchema();
        await ensureLeadImportSchema();
        const available = await listConsultants(unit.id);
        const availableIds = new Set(available.map((item) => item.id));
        if (consultantIds.some((id) => !availableIds.has(id))) {
          return Response.json({ error: "Há consultores inválidos ou fora da unidade." }, { status: 400 });
        }

        const result = await withTransaction(async (client) => {
          let imported = 0;
          let duplicates = 0;
          const distribution = new Map<string, number>();
          for (const row of rows) {
            const phone = normalizePhone(row.phone);
            const phone2 = normalizePhone(row.phone2);
            if (skipDuplicates) {
              const existing = await client.query(`
                select 1 from app_leads
                where unit_id = $1 and (regexp_replace(phone, '\\D', '', 'g') = $2 or regexp_replace(coalesce(phone2, ''), '\\D', '', 'g') = $2)
                limit 1
              `, [unit.id, phone]);
              if (existing.rowCount) { duplicates += 1; continue; }
            }
            const consultantId = consultantIds.length === 1 ? consultantIds[0] : consultantIds[randomInt(consultantIds.length)];
            const lead = await client.query<{ id: string }>(`
              insert into app_leads (unit_id, full_name, phone, phone2, observations, stage, created_by)
              values ($1, $2, $3, nullif($4, ''), nullif($5, ''), 'Novo lead', $6)
              returning id
            `, [unit.id, row.fullName, phone, phone2, row.observations, consultantId]);
            await client.query(`
              insert into app_lead_import_rows (lead_id, campaign_name, form_id, whatsapp_number, imported_by)
              values ($1, nullif($2, ''), nullif($3, ''), nullif($4, ''), $5)
            `, [lead.rows[0].id, row.campaignName, row.formId, phone2, session.user.id]);
            imported += 1;
            distribution.set(consultantId, (distribution.get(consultantId) ?? 0) + 1);
          }
          return { imported, duplicates, distribution: Object.fromEntries(distribution) };
        });
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
