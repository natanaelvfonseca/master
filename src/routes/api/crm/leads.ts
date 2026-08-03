import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import {
  buildTurmaLabel,
  type LeadRecord,
  type LeadStage,
  type StudentStage,
} from "@/lib/commercial-types";
import {
  ensureCommercialSchema,
  getUnitFromBody,
  getUnitFromRequest,
  isUuid,
} from "@/lib/server/commercial-schema";
import { canOperateCrm, canViewAllUnitLeads, canViewStudents } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import { ensureCourseAttendanceSchema } from "@/lib/server/course-attendances";
import { queryDb } from "@/lib/server/db";

type LeadRow = QueryResultRow & {
  id: string;
  unit_id: string;
  unit_name: string;
  full_name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  city: string | null;
  turma_id: string | null;
  turma_name: string | null;
  turma_date: string | null;
  course_id: string | null;
  course_name_snapshot: string | null;
  course_value_snapshot: string | null;
  acquisition_channel_id: string | null;
  acquisition_channel_name_snapshot: string | null;
  created_by: string | null;
  created_by_name: string | null;
  observations: string | null;
  campaign_name: string | null;
  form_id: string | null;
  stage: LeadStage;
  student_stage: StudentStage;
  created_at: string;
};

type CourseSnapshotRow = QueryResultRow & {
  id: string;
  name: string;
  value: string;
};

type ChannelSnapshotRow = QueryResultRow & {
  id: string;
  name: string;
};

type TurmaSnapshotRow = QueryResultRow & {
  id: string;
  course_id: string;
  city: string;
  state: string;
  class_date: string;
};

function mapLead(row: LeadRow, exposeAcquisitionChannel: boolean): LeadRecord {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitName: row.unit_name,
    fullName: row.full_name,
    phone: row.phone,
    phone2: row.phone2,
    email: row.email,
    city: row.city,
    turmaId: row.turma_id,
    turmaName: row.turma_name,
    turmaDate: row.turma_date,
    courseId: row.course_id,
    courseName: row.course_name_snapshot,
    courseValue: row.course_value_snapshot ? Number(row.course_value_snapshot) : null,
    acquisitionChannelId: exposeAcquisitionChannel ? row.acquisition_channel_id : null,
    acquisitionChannelName: exposeAcquisitionChannel ? row.acquisition_channel_name_snapshot : null,
    createdById: row.created_by,
    createdByName: row.created_by_name,
    observations: row.observations,
    campaignName: row.campaign_name,
    formId: row.form_id,
    stage: row.stage,
    studentStage: row.student_stage,
    createdAt: row.created_at,
  };
}

function parseLeadPayload(body: unknown) {
  const data = body as {
    fullName?: unknown;
    phone?: unknown;
    phone2?: unknown;
    email?: unknown;
    city?: unknown;
    turmaId?: unknown;
    courseId?: unknown;
    acquisitionChannelId?: unknown;
    unitId?: unknown;
    observations?: unknown;
  };

  return {
    fullName: typeof data?.fullName === "string" ? data.fullName.trim() : "",
    phone: typeof data?.phone === "string" ? data.phone.trim() : "",
    phone2: typeof data?.phone2 === "string" ? data.phone2.trim() : "",
    email: typeof data?.email === "string" ? data.email.trim() : "",
    city: typeof data?.city === "string" ? data.city.trim() : "",
    turmaId: typeof data?.turmaId === "string" ? data.turmaId.trim() : "",
    courseId: typeof data?.courseId === "string" ? data.courseId.trim() : "",
    acquisitionChannelId:
      typeof data?.acquisitionChannelId === "string" ? data.acquisitionChannelId.trim() : "",
    unitId: data?.unitId,
    observations: typeof data?.observations === "string" ? data.observations.trim() : "",
  };
}

function getLeadListView(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("view") === "students" ? "students" : "pipeline";
}

async function getCourseSnapshot(courseId: string, unitId: string) {
  if (!courseId) {
    return { course: null };
  }

  if (!isUuid(courseId)) {
    return { error: "Curso inválido.", status: 400 };
  }

  const result = await queryDb<CourseSnapshotRow>(
    `
      select id, name, value::text
      from app_courses
      where id = $1 and unit_id = $2
      limit 1
    `,
    [courseId, unitId],
  );

  const course = result.rows[0];

  if (!course) {
    return { error: "Curso não encontrado.", status: 404 };
  }

  return { course };
}

async function getChannelSnapshot(channelId: string, unitId: string) {
  if (!channelId) {
    return { channel: null };
  }

  if (!isUuid(channelId)) {
    return { error: "Canal inválido.", status: 400 };
  }

  const result = await queryDb<ChannelSnapshotRow>(
    `
      select id, name
      from app_acquisition_channels
      where id = $1 and unit_id = $2
      limit 1
    `,
    [channelId, unitId],
  );

  const channel = result.rows[0];

  if (!channel) {
    return { error: "Canal não encontrado.", status: 404 };
  }

  return { channel };
}

async function getTurmaSnapshot(turmaId: string, unitId: string, courseId: string) {
  if (!turmaId || !isUuid(turmaId)) {
    return { error: "Selecione uma turma ativa.", status: 400 };
  }

  const result = await queryDb<TurmaSnapshotRow>(
    `
      select id, course_id, city, state, class_date::text
      from app_course_attendances
      where id = $1
        and unit_id = $2
        and status = 'active'
      limit 1
    `,
    [turmaId, unitId],
  );
  const turma = result.rows[0];

  if (!turma) {
    return { error: "Turma não encontrada ou inativa.", status: 404 };
  }

  if (courseId && turma.course_id !== courseId) {
    return { error: "A turma não pertence ao curso selecionado.", status: 400 };
  }

  return { turma };
}

export const Route = createFileRoute("/api/crm/leads")({
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
        await ensureCourseAttendanceSchema();

        const listView = getLeadListView(request);
        if (listView === "students" && !canViewStudents(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const canManageUnitLeads = canViewAllUnitLeads(session.user.role);
        const exposeAcquisitionChannel = session.user.role !== "CONSULTOR";
        const result = await queryDb<LeadRow>(
          `
            select
              l.id,
              l.unit_id,
              un.name as unit_name,
              l.full_name,
              l.phone,
              l.phone2,
              l.email,
              l.city,
              l.turma_id,
              case when turma.id is not null then
                coalesce(course.name, l.course_name_snapshot, 'Curso') || ' · ' ||
                turma.city || '/' || turma.state || ' · ' ||
                to_char(turma.class_date, 'DD/MM/YYYY')
              else null end as turma_name,
              turma.class_date::text as turma_date,
              l.course_id,
              l.course_name_snapshot,
              l.course_value_snapshot::text,
              l.acquisition_channel_id,
              l.acquisition_channel_name_snapshot,
              l.created_by,
              owner.name as created_by_name,
              l.observations,
              coalesce(import_info.campaign_name, meta_info.campaign_name) as campaign_name,
              coalesce(import_info.form_id, meta_info.form_id) as form_id,
              l.stage,
              l.student_stage,
              l.created_at::text
            from app_leads l
            inner join app_units un on un.id = l.unit_id
            left join app_users owner on owner.id = l.created_by
            left join app_course_attendances turma on turma.id = l.turma_id
            left join app_courses course on course.id = turma.course_id
            left join app_lead_import_rows import_info on import_info.lead_id = l.id
            left join lateral (
              select e.campaign_name, e.form_id
              from app_meta_lead_events e
              where e.lead_id = l.id
              order by e.received_at desc
              limit 1
            ) meta_info on true
            where l.unit_id = $1
              and (
                $4::boolean
                or ($3 = 'students' and coalesce(l.converted_by, l.created_by) = $2)
                or ($3 = 'pipeline' and l.created_by = $2)
              )
              and (
                ($3 = 'students' and l.stage = 'Matriculado')
                or ($3 = 'pipeline' and l.stage <> 'Matriculado')
              )
            order by l.created_at desc
          `,
          [unit.id, session.user.id, listView, canManageUnitLeads],
        );

        return Response.json(
          { leads: result.rows.map((row) => mapLead(row, exposeAcquisitionChannel)) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!canOperateCrm(session.user.role)) {
          return Response.json(
            { ok: false, error: "Acesso somente para leitura." },
            { status: 403 },
          );
        }

        const body = await request.json().catch(() => null);
        const payload = parseLeadPayload(body);
        const unit = getUnitFromBody(session, payload.unitId);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!payload.fullName || !payload.phone) {
          return Response.json(
            { ok: false, error: "Nome completo e telefone são obrigatórios." },
            { status: 400 },
          );
        }

        await ensureCommercialSchema();
        await ensureCourseAttendanceSchema();

        const channelResult = await getChannelSnapshot(payload.acquisitionChannelId, unit.id);

        if (channelResult.error) {
          return Response.json(
            { ok: false, error: channelResult.error },
            { status: channelResult.status },
          );
        }

        const channel = channelResult.channel;
        const turmaResult = await getTurmaSnapshot(
          payload.turmaId,
          unit.id,
          payload.courseId,
        );

        if ("error" in turmaResult) {
          return Response.json(
            { ok: false, error: turmaResult.error },
            { status: turmaResult.status },
          );
        }

        const turma = turmaResult.turma;
        const courseResult = await getCourseSnapshot(turma.course_id, unit.id);

        if (courseResult.error || !courseResult.course) {
          return Response.json(
            { ok: false, error: courseResult.error ?? "Curso da turma não encontrado." },
            { status: courseResult.status ?? 404 },
          );
        }

        const course = courseResult.course;
        const turmaLocation = `${turma.city} - ${turma.state}`;
        const turmaName = buildTurmaLabel({
          courseName: course.name,
          city: turma.city,
          state: turma.state,
          classDate: turma.class_date,
        });
        const result = await queryDb<LeadRow>(
          `
            insert into app_leads (
              unit_id,
              full_name,
              phone,
              phone2,
              email,
              city,
              turma_id,
              course_id,
              course_name_snapshot,
              course_value_snapshot,
              acquisition_channel_id,
              acquisition_channel_name_snapshot,
              observations,
              created_by
            )
            values ($1, $2, $3, nullif($4, ''), nullif($5, ''), $6, $7, $8, $9, $10, $11, $12, nullif($13, ''), $14)
            returning
              id,
              unit_id,
              (select name from app_units where id = $1) as unit_name,
              full_name,
              phone,
              phone2,
              email,
              city,
              turma_id,
              $16::text as turma_name,
              $17::text as turma_date,
              course_id,
              course_name_snapshot,
              course_value_snapshot::text,
              acquisition_channel_id,
              acquisition_channel_name_snapshot,
              created_by,
              $15::text as created_by_name,
              observations,
              null::text as campaign_name,
              null::text as form_id,
              stage,
              created_at::text
          `,
          [
            unit.id,
            payload.fullName,
            payload.phone,
            payload.phone2,
            payload.email,
            turmaLocation,
            turma.id,
            course?.id ?? null,
            course?.name ?? null,
            course ? Number(course.value) : null,
            channel?.id ?? null,
            channel?.name ?? null,
            payload.observations,
            session.user.id,
            session.user.name,
            turmaName,
            turma.class_date,
          ],
        );

        return Response.json(
          { lead: mapLead(result.rows[0], session.user.role !== "CONSULTOR") },
          { status: 201 },
        );
      },
    },
  },
});
