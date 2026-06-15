import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import { canTransferLeads } from "@/lib/auth-types";
import {
  ensureCommercialSchema,
  getUnitFromBody,
  getUnitFromRequest,
  isUuid,
} from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb, withTransaction } from "@/lib/server/db";

type TransferConsultantRow = QueryResultRow & {
  id: string;
  name: string;
  email: string;
};

type TransferLeadRow = QueryResultRow & {
  id: string;
  full_name: string;
  phone: string;
  course_name_snapshot: string | null;
  stage: LeadStage;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  age_hours: number | string;
  transferable: boolean;
};

type ExistingTaskTableRow = QueryResultRow & {
  table_name: string | null;
};

type TransferableLeadIdRow = QueryResultRow & {
  id: string;
};

const MAX_TRANSFER_LEADS = 250;

function uniqueUuidList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(isUuid),
    ),
  ).slice(0, MAX_TRANSFER_LEADS);
}

function mapTransferLead(row: TransferLeadRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    courseName: row.course_name_snapshot,
    stage: row.stage,
    createdAt: row.created_at,
    createdById: row.created_by,
    createdByName: row.created_by_name,
    ageHours: Number(row.age_hours) || 0,
    transferable: row.transferable,
  };
}

async function listConsultants(unitId: string) {
  const result = await queryDb<TransferConsultantRow>(
    `
      select distinct
        u.id,
        u.name,
        u.email
      from app_users u
      inner join app_user_units uu on uu.user_id = u.id
      where uu.unit_id = $1
        and u.role = 'CONSULTOR'
        and u.status = 'active'
      order by u.name asc
    `,
    [unitId],
  );

  return result.rows;
}

async function listTransferLeads(unitId: string) {
  const result = await queryDb<TransferLeadRow>(
    `
      select
        l.id,
        l.full_name,
        l.phone,
        l.course_name_snapshot,
        l.stage,
        l.created_at::text,
        l.created_by,
        owner.name as created_by_name,
        floor(extract(epoch from (now() - l.created_at)) / 3600)::int as age_hours,
        (l.created_at <= now() - interval '48 hours') as transferable
      from app_leads l
      left join app_users owner on owner.id = l.created_by
      where l.unit_id = $1
        and l.stage <> 'Matriculado'
      order by
        l.created_at asc,
        l.full_name asc
    `,
    [unitId],
  );

  return result.rows.map(mapTransferLead);
}

async function appCrmTasksExists() {
  const result = await queryDb<ExistingTaskTableRow>(
    `select to_regclass('public.app_crm_tasks')::text as table_name`,
  );

  return Boolean(result.rows[0]?.table_name);
}

export const Route = createFileRoute("/api/crm/transfer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!canTransferLeads(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const unit = getUnitFromRequest(session, request);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        await ensureCommercialSchema();

        const [consultants, leads] = await Promise.all([
          listConsultants(unit.id),
          listTransferLeads(unit.id),
        ]);

        return Response.json({ consultants, leads }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!canTransferLeads(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const unit = getUnitFromBody(session, body?.unitId ?? session.activeUnit?.id);
        const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
        const leadIds = uniqueUuidList(body?.leadIds);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!isUuid(targetUserId)) {
          return Response.json({ ok: false, error: "Consultor inválido." }, { status: 400 });
        }

        if (!leadIds.length) {
          return Response.json(
            { ok: false, error: "Selecione ao menos um lead." },
            { status: 400 },
          );
        }

        await ensureCommercialSchema();

        const targetResult = await queryDb<TransferConsultantRow>(
          `
            select distinct
              u.id,
              u.name,
              u.email
            from app_users u
            inner join app_user_units uu on uu.user_id = u.id
            where u.id = $1
              and uu.unit_id = $2
              and u.role = 'CONSULTOR'
              and u.status = 'active'
            limit 1
          `,
          [targetUserId, unit.id],
        );

        if (!targetResult.rows[0]) {
          return Response.json(
            { ok: false, error: "Consultor de destino indisponível." },
            { status: 404 },
          );
        }

        const eligibleResult = await queryDb<TransferableLeadIdRow>(
          `
            select id
            from app_leads
            where id = any($1::uuid[])
              and unit_id = $2
              and stage <> 'Matriculado'
              and created_at <= now() - interval '48 hours'
          `,
          [leadIds, unit.id],
        );
        const eligibleIds = eligibleResult.rows.map((row) => row.id);

        if (eligibleIds.length !== leadIds.length) {
          return Response.json(
            {
              ok: false,
              error: "Há leads selecionados sem 48 horas de criação ou fora da unidade.",
            },
            { status: 400 },
          );
        }

        const tasksTableExists = await appCrmTasksExists();
        await withTransaction(async (client) => {
          await client.query(
            `
              update app_leads
              set created_by = $2,
                  updated_at = now()
              where id = any($1::uuid[])
                and unit_id = $3
            `,
            [eligibleIds, targetUserId, unit.id],
          );

          if (tasksTableExists) {
            await client.query(
              `
                update app_crm_tasks
                set created_by = $2,
                    updated_at = now()
                where lead_id = any($1::uuid[])
                  and status <> 'archived'
              `,
              [eligibleIds, targetUserId],
            );
          }
        });

        return Response.json({
          ok: true,
          transferredIds: eligibleIds,
          targetUser: targetResult.rows[0],
        });
      },
    },
  },
});
