import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import { ensureCommercialSchema, isUuid } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type LeadUnitRow = QueryResultRow & {
  unit_id: string;
  created_by: string | null;
};

type LeadEditableRow = QueryResultRow & {
  unit_id: string;
  created_by: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  course_id: string | null;
  acquisition_channel_id: string | null;
  observations: string | null;
  stage: LeadStage;
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

const allowedStages: Array<LeadStage> = [
  "Novo lead",
  "Em contato",
  "Qualificado",
  "Proposta",
  "Pagamento pendente",
  "Confirmado",
  "Recuperação",
  "Matriculado",
];

function parseStage(body: unknown) {
  const data = body as { stage?: unknown };
  return typeof data?.stage === "string" ? data.stage.trim() : "";
}

function parseLeadUpdate(body: unknown) {
  const data = body as {
    fullName?: unknown;
    phone?: unknown;
    email?: unknown;
    city?: unknown;
    courseId?: unknown;
    acquisitionChannelId?: unknown;
    observations?: unknown;
    stage?: unknown;
  };

  return {
    fullName: typeof data?.fullName === "string" ? data.fullName.trim() : "",
    phone: typeof data?.phone === "string" ? data.phone.trim() : "",
    email: typeof data?.email === "string" ? data.email.trim() : "",
    city: typeof data?.city === "string" ? data.city.trim() : "",
    courseId: typeof data?.courseId === "string" ? data.courseId.trim() : "",
    acquisitionChannelId:
      typeof data?.acquisitionChannelId === "string" ? data.acquisitionChannelId.trim() : "",
    observations: typeof data?.observations === "string" ? data.observations.trim() : "",
    stage: typeof data?.stage === "string" ? data.stage.trim() : "",
  };
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

async function recordPaidStudentPayment(leadId: string, userId: string) {
  await queryDb(
    `
      insert into app_student_payments (
        unit_id,
        lead_id,
        description,
        amount,
        status,
        due_at,
        paid_at,
        created_by
      )
      select
        l.unit_id,
        l.id,
        'Taxa/matrícula confirmada',
        coalesce(l.course_value_snapshot, 0),
        'paid',
        coalesce(l.payment_confirmed_at, l.converted_at, now())::date,
        coalesce(l.payment_confirmed_at, l.converted_at, now()),
        $2
      from app_leads l
      where l.id = $1
        and not exists (
          select 1
          from app_student_payments p
          where p.lead_id = l.id
            and p.status = 'paid'
        )
    `,
    [leadId, userId],
  );
}

export const Route = createFileRoute("/api/crm/leads/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!isUuid(params.id)) {
          return Response.json({ ok: false, error: "Lead inválido." }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const payload = parseLeadUpdate(body);
        const nextStage = payload.stage || parseStage(body);

        await ensureCommercialSchema();

        const leadResult = await queryDb<LeadEditableRow>(
          `
            select
              unit_id,
              created_by,
              full_name,
              phone,
              email,
              city,
              course_id,
              acquisition_channel_id,
              observations,
              stage
            from app_leads
            where id = $1
            limit 1
          `,
          [params.id],
        );

        const lead = leadResult.rows[0];

        if (!lead) {
          return Response.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });
        }

        if (!session.units.some((unit) => unit.id === lead.unit_id)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        if (lead.created_by !== session.user.id) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        if (!payload.fullName || !payload.phone) {
          if (!nextStage || !allowedStages.includes(nextStage as LeadStage)) {
            return Response.json(
              { ok: false, error: "Nome completo e telefone são obrigatórios." },
              { status: 400 },
            );
          }
        }

        const hasLeadFields =
          payload.fullName ||
          payload.phone ||
          payload.email !== "" ||
          payload.city !== "" ||
          payload.courseId !== "" ||
          payload.acquisitionChannelId !== "" ||
          payload.observations !== "";

        if (!hasLeadFields && (!nextStage || !allowedStages.includes(nextStage as LeadStage))) {
          return Response.json({ ok: false, error: "Dados insuficientes." }, { status: 400 });
        }

        const resolvedStage =
          nextStage && allowedStages.includes(nextStage as LeadStage)
            ? (nextStage as LeadStage)
            : lead.stage;

        if (payload.fullName && payload.phone) {
          const courseResult = await getCourseSnapshot(payload.courseId, lead.unit_id);

          if (courseResult.error) {
            return Response.json(
              { ok: false, error: courseResult.error },
              { status: courseResult.status },
            );
          }

          const channelResult = await getChannelSnapshot(
            payload.acquisitionChannelId,
            lead.unit_id,
          );

          if (channelResult.error) {
            return Response.json(
              { ok: false, error: channelResult.error },
              { status: channelResult.status },
            );
          }

          await queryDb(
            `
              update app_leads
              set
                full_name = $2,
                phone = $3,
                email = nullif($4, ''),
                city = nullif($5, ''),
                course_id = $6,
                course_name_snapshot = $7,
                course_value_snapshot = $8,
                acquisition_channel_id = $9,
                acquisition_channel_name_snapshot = $10,
                observations = nullif($11, ''),
                stage = $12,
                first_contact_at = case
                  when $12 <> 'Novo lead' then coalesce(first_contact_at, now())
                  else first_contact_at
                end,
                last_follow_up_at = case
                  when $12 <> stage and $12 <> 'Novo lead' then now()
                  else last_follow_up_at
                end,
                follow_up_count = case
                  when $12 <> stage and $12 <> 'Novo lead' then follow_up_count + 1
                  else follow_up_count
                end,
                converted_at = case
                  when $12 = 'Matriculado' then coalesce(converted_at, now())
                  else converted_at
                end,
                converted_by = case
                  when $12 = 'Matriculado' then coalesce(converted_by, $13)
                  else converted_by
                end,
                payment_status = case
                  when $12 = 'Matriculado' then 'paid'
                  else payment_status
                end,
                payment_confirmed_at = case
                  when $12 = 'Matriculado' then coalesce(payment_confirmed_at, now())
                  else payment_confirmed_at
                end,
                updated_at = now()
              where id = $1
            `,
            [
              params.id,
              payload.fullName,
              payload.phone,
              payload.email,
              payload.city,
              courseResult.course?.id ?? null,
              courseResult.course?.name ?? null,
              courseResult.course ? Number(courseResult.course.value) : null,
              channelResult.channel?.id ?? null,
              channelResult.channel?.name ?? null,
              payload.observations,
              resolvedStage,
              session.user.id,
            ],
          );

          if (resolvedStage === "Matriculado") {
            await recordPaidStudentPayment(params.id, session.user.id);
          }

          return Response.json({ ok: true, stage: resolvedStage });
        }

        if (!nextStage || !allowedStages.includes(nextStage as LeadStage)) {
          return Response.json({ ok: false, error: "Estágio inválido." }, { status: 400 });
        }

        await queryDb(
          `
            update app_leads
            set
              stage = $2,
              first_contact_at = case
                when $2 <> 'Novo lead' then coalesce(first_contact_at, now())
                else first_contact_at
              end,
              last_follow_up_at = case
                when $2 <> stage and $2 <> 'Novo lead' then now()
                else last_follow_up_at
              end,
              follow_up_count = case
                when $2 <> stage and $2 <> 'Novo lead' then follow_up_count + 1
                else follow_up_count
              end,
              converted_at = case
                when $2 = 'Matriculado' then coalesce(converted_at, now())
                else converted_at
              end,
              converted_by = case
                when $2 = 'Matriculado' then coalesce(converted_by, $3)
                else converted_by
              end,
              payment_status = case
                when $2 = 'Matriculado' then 'paid'
                else payment_status
              end,
              payment_confirmed_at = case
                when $2 = 'Matriculado' then coalesce(payment_confirmed_at, now())
                else payment_confirmed_at
              end,
              updated_at = now()
            where id = $1
          `,
          [params.id, nextStage, session.user.id],
        );

        if (nextStage === "Matriculado") {
          await recordPaidStudentPayment(params.id, session.user.id);
        }

        return Response.json({ ok: true, stage: nextStage });
      },
      DELETE: async ({ request, params }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!isUuid(params.id)) {
          return Response.json({ ok: false, error: "Lead inválido." }, { status: 400 });
        }

        await ensureCommercialSchema();

        const leadResult = await queryDb<LeadUnitRow>(
          `
            select unit_id, created_by
            from app_leads
            where id = $1
            limit 1
          `,
          [params.id],
        );
        const lead = leadResult.rows[0];

        if (!lead) {
          return Response.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });
        }

        if (!session.units.some((unit) => unit.id === lead.unit_id)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        if (lead.created_by !== session.user.id) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        await queryDb(
          `
            delete from app_leads
            where id = $1
          `,
          [params.id],
        );

        return Response.json({ ok: true });
      },
    },
  },
});
