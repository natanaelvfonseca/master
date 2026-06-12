import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import { ensureCommercialSchema, isUuid } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type LeadUnitRow = QueryResultRow & {
  unit_id: string;
};

type LeadEditableRow = QueryResultRow & {
  unit_id: string;
  full_name: string;
  phone: string;
  email: string | null;
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
    courseId?: unknown;
    acquisitionChannelId?: unknown;
    observations?: unknown;
    stage?: unknown;
  };

  return {
    fullName: typeof data?.fullName === "string" ? data.fullName.trim() : "",
    phone: typeof data?.phone === "string" ? data.phone.trim() : "",
    email: typeof data?.email === "string" ? data.email.trim() : "",
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
              full_name,
              phone,
              email,
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
          payload.courseId !== "" ||
          payload.acquisitionChannelId !== "" ||
          payload.observations !== "";

        if (!hasLeadFields && (!nextStage || !allowedStages.includes(nextStage as LeadStage))) {
          return Response.json({ ok: false, error: "Dados insuficientes." }, { status: 400 });
        }

        if (payload.fullName && payload.phone) {
          const courseResult = await getCourseSnapshot(payload.courseId, lead.unit_id);

          if (courseResult.error) {
            return Response.json(
              { ok: false, error: courseResult.error },
              { status: courseResult.status },
            );
          }

          const channelResult = await getChannelSnapshot(payload.acquisitionChannelId, lead.unit_id);

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
                course_id = $5,
                course_name_snapshot = $6,
                course_value_snapshot = $7,
                acquisition_channel_id = $8,
                acquisition_channel_name_snapshot = $9,
                observations = nullif($10, ''),
                stage = coalesce($11, stage)
              where id = $1
            `,
            [
              params.id,
              payload.fullName,
              payload.phone,
              payload.email,
              courseResult.course?.id ?? null,
              courseResult.course?.name ?? null,
              courseResult.course ? Number(courseResult.course.value) : null,
              channelResult.channel?.id ?? null,
              channelResult.channel?.name ?? null,
              payload.observations,
              nextStage && allowedStages.includes(nextStage as LeadStage) ? nextStage : lead.stage,
            ],
          );

          return Response.json({ ok: true, stage: nextStage && allowedStages.includes(nextStage as LeadStage) ? nextStage : lead.stage });
        }

        if (!nextStage || !allowedStages.includes(nextStage as LeadStage)) {
          return Response.json({ ok: false, error: "Estágio inválido." }, { status: 400 });
        }

        await queryDb(
          `
            update app_leads
            set stage = $2
            where id = $1
          `,
          [params.id, nextStage],
        );

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
            select unit_id
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
