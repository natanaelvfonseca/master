import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import {
  canCreateAdRequests,
  canManageAdRequests,
  canViewAdRequests,
  isExecutiveRole,
  type UserRole,
} from "@/lib/auth-types";
import {
  AD_REQUEST_STATUSES,
  type AdRequest,
  type AdRequestStatus,
} from "@/lib/ad-request-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import { ensureCommercialSchema, getUnitFromBody, isUuid } from "@/lib/server/commercial-schema";
import { queryDb } from "@/lib/server/db";

type AdRequestRow = QueryResultRow & {
  id: string;
  unit_id: string;
  unit_name: string;
  course_id: string | null;
  course_name: string;
  city: string;
  consultant_id: string | null;
  consultant_name: string;
  class_date: string;
  observation: string;
  status: AdRequestStatus;
  master_note: string;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  due_at: string;
  updated_at: string;
  completed_at: string | null;
  is_read: boolean;
};

const MAX_CITY_LENGTH = 100;
const MAX_OBSERVATION_LENGTH = 1600;
const MAX_MASTER_NOTE_LENGTH = 1600;
let schemaPromise: Promise<void> | null = null;

function ensureAdRequestSchema() {
  schemaPromise ??= queryDb(`
    create table if not exists app_ad_requests (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      course_id uuid references app_courses(id) on delete set null,
      course_name text not null,
      city text not null,
      consultant_id uuid references app_users(id) on delete set null,
      consultant_name text not null,
      class_date date not null,
      observation text not null default '',
      status text not null default 'novo' check (status in ('novo','em_producao','aguardando_aprovacao','concluido','cancelado')),
      master_note text not null default '',
      created_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      due_at timestamptz not null,
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    );

    create table if not exists app_ad_request_reads (
      request_id uuid not null references app_ad_requests(id) on delete cascade,
      user_id uuid not null references app_users(id) on delete cascade,
      read_at timestamptz not null default now(),
      primary key (request_id, user_id)
    );

    create index if not exists app_ad_requests_unit_created_idx
      on app_ad_requests (unit_id, created_at desc);
    create index if not exists app_ad_requests_status_due_idx
      on app_ad_requests (status, due_at);
    create index if not exists app_ad_requests_creator_idx
      on app_ad_requests (created_by, created_at desc);
  `)
    .then(() => undefined)
    .catch((error) => {
      schemaPromise = null;
      throw error;
    });

  return schemaPromise;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isStatus(value: unknown): value is AdRequestStatus {
  return typeof value === "string" && AD_REQUEST_STATUSES.includes(value as AdRequestStatus);
}

function mapRequest(row: AdRequestRow): AdRequest {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitName: row.unit_name,
    courseId: row.course_id,
    courseName: row.course_name,
    city: row.city,
    consultantId: row.consultant_id,
    consultantName: row.consultant_name,
    classDate: row.class_date,
    observation: row.observation ?? "",
    status: row.status,
    masterNote: row.master_note ?? "",
    createdById: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    dueAt: row.due_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    isRead: Boolean(row.is_read),
  };
}

async function listRequests(userId: string, role: UserRole, notificationsOnly: boolean) {
  const seesAll = canManageAdRequests(role) || isExecutiveRole(role);
  const result = await queryDb<AdRequestRow>(
    `
      select
        r.id, r.unit_id, unit.name as unit_name, r.course_id, r.course_name,
        r.city, r.consultant_id, r.consultant_name, r.class_date::text,
        r.observation, r.status, r.master_note, r.created_by,
        coalesce(author.name, 'Usuário removido') as created_by_name,
        r.created_at::text, r.due_at::text, r.updated_at::text,
        r.completed_at::text,
        (read.request_id is not null) as is_read
      from app_ad_requests r
      inner join app_units unit on unit.id = r.unit_id
      left join app_users author on author.id = r.created_by
      left join app_ad_request_reads read
        on read.request_id = r.id and read.user_id = $1
      where ($2::boolean or r.created_by = $1)
        and (not $3::boolean or (r.status = 'novo' and read.request_id is null))
      order by
        case r.status
          when 'novo' then 1 when 'em_producao' then 2
          when 'aguardando_aprovacao' then 3 when 'concluido' then 4 else 5
        end,
        r.due_at asc,
        r.created_at desc
    `,
    [userId, seesAll, notificationsOnly],
  );

  return result.rows.map(mapRequest);
}

async function getMetadata(unitId: string) {
  const [courses, consultants, cities] = await Promise.all([
    queryDb<{ id: string; name: string }>(
      `select id, name from app_courses where unit_id = $1 and status = 'active' order by name`,
      [unitId],
    ),
    queryDb<{ id: string; name: string }>(
      `
        select u.id, u.name
        from app_users u
        where u.role = 'CONSULTOR' and u.status = 'active'
          and (u.primary_unit_id = $1 or exists (
            select 1 from app_user_units uu where uu.user_id = u.id and uu.unit_id = $1
          ))
        order by u.name
      `,
      [unitId],
    ),
    queryDb<{ city: string }>(
      `
        select city from (
          select distinct city from app_course_attendances
          where unit_id = $1 and status = 'active' and city <> ''
          union
          select distinct city from app_leads
          where unit_id = $1 and city is not null and city <> ''
        ) cities order by city
      `,
      [unitId],
    ).catch(() => ({ rows: [] as Array<{ city: string }> })),
  ]);

  return { courses: courses.rows, consultants: consultants.rows, cities: cities.rows.map((row) => row.city) };
}

async function getRequest(id: string, userId: string) {
  const result = await queryDb<AdRequestRow>(
    `
      select r.id, r.unit_id, unit.name as unit_name, r.course_id, r.course_name,
        r.city, r.consultant_id, r.consultant_name, r.class_date::text,
        r.observation, r.status, r.master_note, r.created_by,
        coalesce(author.name, 'Usuário removido') as created_by_name,
        r.created_at::text, r.due_at::text, r.updated_at::text, r.completed_at::text,
        (read.request_id is not null) as is_read
      from app_ad_requests r
      inner join app_units unit on unit.id = r.unit_id
      left join app_users author on author.id = r.created_by
      left join app_ad_request_reads read on read.request_id = r.id and read.user_id = $2
      where r.id = $1 limit 1
    `,
    [id, userId],
  );
  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

export const Route = createFileRoute("/api/ad-requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canViewAdRequests(session.user.role)) {
          return Response.json({ error: "Acesso negado." }, { status: 403 });
        }

        await ensureCommercialSchema();
        await ensureAdRequestSchema();
        const notificationsOnly = new URL(request.url).searchParams.get("view") === "notifications";
        const requests = await listRequests(session.user.id, session.user.role, notificationsOnly);
        const metadata = session.activeUnit ? await getMetadata(session.activeUnit.id) : { courses: [], consultants: [], cities: [] };

        return Response.json(
          {
            requests,
            ...metadata,
            canCreate: canCreateAdRequests(session.user.role),
            canManage: canManageAdRequests(session.user.role),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canCreateAdRequests(session.user.role)) {
          return Response.json({ error: "Apenas Diretores podem criar solicitações." }, { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const unit = getUnitFromBody(session, body?.unitId);
        const courseId = text(body?.courseId, 80);
        const consultantId = text(body?.consultantId, 80);
        const city = text(body?.city, MAX_CITY_LENGTH);
        const classDate = text(body?.classDate, 10);
        const observation = text(body?.observation, MAX_OBSERVATION_LENGTH);

        if (!unit) return Response.json({ error: "Unidade indisponível." }, { status: 403 });
        if (!isUuid(courseId) || !isUuid(consultantId) || !city || !/^\d{4}-\d{2}-\d{2}$/.test(classDate)) {
          return Response.json({ error: "Preencha curso, cidade, consultor e data da turma." }, { status: 400 });
        }

        await ensureCommercialSchema();
        await ensureAdRequestSchema();
        const [course, consultant] = await Promise.all([
          queryDb<{ name: string }>(`select name from app_courses where id = $1 and unit_id = $2 and status = 'active'`, [courseId, unit.id]),
          queryDb<{ name: string }>(
            `select u.name from app_users u where u.id = $1 and u.role = 'CONSULTOR' and u.status = 'active'
             and (u.primary_unit_id = $2 or exists (select 1 from app_user_units uu where uu.user_id = u.id and uu.unit_id = $2))`,
            [consultantId, unit.id],
          ),
        ]);
        if (!course.rows[0] || !consultant.rows[0]) {
          return Response.json({ error: "Curso ou consultor não pertence à unidade selecionada." }, { status: 400 });
        }

        const inserted = await queryDb<{ id: string }>(
          `
            insert into app_ad_requests (
              unit_id, course_id, course_name, city, consultant_id, consultant_name,
              class_date, observation, created_by, due_at
            ) values (
              $1, $2, $3, $4, $5, $6, $7::date, $8, $9,
              case extract(isodow from now())
                when 5 then now() + interval '3 days'
                when 6 then now() + interval '3 days'
                when 7 then now() + interval '2 days'
                else now() + interval '1 day'
              end
            ) returning id
          `,
          [unit.id, courseId, course.rows[0].name, city, consultantId, consultant.rows[0].name, classDate, observation, session.user.id],
        );
        const created = await getRequest(inserted.rows[0].id, session.user.id);
        return Response.json({ request: created }, { status: 201 });
      },
      PATCH: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canManageAdRequests(session.user.role)) {
          return Response.json({ error: "Acesso negado." }, { status: 403 });
        }
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const requestId = text(body?.requestId, 80);
        if (!isUuid(requestId)) return Response.json({ error: "Solicitação inválida." }, { status: 400 });
        await ensureAdRequestSchema();

        if (body?.action === "mark_read") {
          await queryDb(
            `insert into app_ad_request_reads (request_id, user_id) values ($1, $2)
             on conflict (request_id, user_id) do update set read_at = now()`,
            [requestId, session.user.id],
          );
          return Response.json({ ok: true });
        }

        const status = isStatus(body?.status) ? body.status : null;
        const masterNote = typeof body?.masterNote === "string" ? text(body.masterNote, MAX_MASTER_NOTE_LENGTH) : null;
        if (!status && masterNote === null) return Response.json({ error: "Nenhuma alteração enviada." }, { status: 400 });
        await queryDb(
          `update app_ad_requests set
             status = coalesce($2, status), master_note = coalesce($3, master_note),
             completed_at = case when $2 = 'concluido' then coalesce(completed_at, now()) when $2 is not null then null else completed_at end,
             updated_at = now()
           where id = $1`,
          [requestId, status, masterNote],
        );
        await queryDb(
          `insert into app_ad_request_reads (request_id, user_id) values ($1, $2)
           on conflict (request_id, user_id) do update set read_at = now()`,
          [requestId, session.user.id],
        );
        return Response.json({ request: await getRequest(requestId, session.user.id) });
      },
    },
  },
});
