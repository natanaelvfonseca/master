import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import { canManageLeadFiles } from "@/lib/auth-types";
import { createSemicolonCsv, csvFileSlug } from "@/lib/lead-export";
import { getSessionFromRequest } from "@/lib/server/auth";
import { ensureCommercialSchema, getUnitFromRequest, isUuid } from "@/lib/server/commercial-schema";
import { ensureCourseAttendanceSchema } from "@/lib/server/course-attendances";
import { queryDb } from "@/lib/server/db";

type ExportLeadRow = QueryResultRow & {
  full_name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  city: string | null;
  course_name: string | null;
  turma_name: string | null;
  acquisition_channel_name: string | null;
  campaign_name: string | null;
  form_id: string | null;
  owner_name: string | null;
  stage: string;
  student_stage: string;
  observations: string | null;
  created_at: string;
};

const MAX_EXPORT_ROWS = 50_000;
const allowedStages = new Set([
  "Leads Novos",
  "Em Atendimento",
  "Follow UP",
  "Aguardando matrícula",
  "Lead Sem retorno",
  "Matriculado",
]);

function optionalUuid(value: string | null) {
  return value && isUuid(value) ? value : null;
}

function optionalDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export const Route = createFileRoute("/api/crm/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canManageLeadFiles(session.user.role))
          return Response.json({ error: "Acesso negado." }, { status: 403 });

        const unit = getUnitFromRequest(session, request);
        if (!unit) return Response.json({ error: "Unidade indisponível." }, { status: 403 });

        const url = new URL(request.url);
        const search = (url.searchParams.get("search") ?? "").trim().slice(0, 200);
        const stageValue = url.searchParams.get("stage");
        const stage = stageValue && allowedStages.has(stageValue) ? stageValue : null;
        const ownerId = optionalUuid(url.searchParams.get("ownerId"));
        const courseId = optionalUuid(url.searchParams.get("courseId"));
        const turmaId = optionalUuid(url.searchParams.get("turmaId"));
        const channelId = optionalUuid(url.searchParams.get("channelId"));
        const dateFrom = optionalDate(url.searchParams.get("dateFrom"));
        const dateTo = optionalDate(url.searchParams.get("dateTo"));

        if (dateFrom && dateTo && dateFrom > dateTo) {
          return Response.json(
            { error: "A data inicial não pode ser posterior à data final." },
            { status: 400 },
          );
        }

        await ensureCommercialSchema();
        await ensureCourseAttendanceSchema();

        const result = await queryDb<ExportLeadRow>(
          `
            select
              l.full_name,
              l.phone,
              l.phone2,
              l.email,
              l.city,
              coalesce(course.name, l.course_name_snapshot) as course_name,
              case when turma.id is not null then
                coalesce(course.name, l.course_name_snapshot, 'Curso') || ' · ' ||
                turma.city || '/' || turma.state || ' · ' ||
                to_char(turma.class_date, 'DD/MM/YYYY')
              else null end as turma_name,
              l.acquisition_channel_name_snapshot as acquisition_channel_name,
              coalesce(import_info.campaign_name, meta_info.campaign_name) as campaign_name,
              coalesce(import_info.form_id, meta_info.form_id) as form_id,
              owner.name as owner_name,
              l.stage,
              case when l.stage = 'Matriculado' then l.student_stage else null end as student_stage,
              l.observations,
              to_char(l.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') as created_at
            from app_leads l
            left join app_users owner on owner.id = l.created_by
            left join app_courses course on course.id = l.course_id
            left join app_course_attendances turma on turma.id = l.turma_id
            left join app_lead_import_rows import_info on import_info.lead_id = l.id
            left join lateral (
              select event.campaign_name, event.form_id
              from app_meta_lead_events event
              where event.lead_id = l.id
              order by event.received_at desc
              limit 1
            ) meta_info on true
            where l.unit_id = $1
              and ($2::text is null or l.stage = $2)
              and ($3::uuid is null or l.created_by = $3)
              and ($4::uuid is null or l.course_id = $4)
              and ($5::uuid is null or l.turma_id = $5)
              and ($6::uuid is null or l.acquisition_channel_id = $6)
              and (
                $7::date is null
                or l.created_at >= ($7::date::timestamp at time zone 'America/Sao_Paulo')
              )
              and (
                $8::date is null
                or l.created_at < (($8::date + 1)::timestamp at time zone 'America/Sao_Paulo')
              )
              and (
                $9::text = ''
                or concat_ws(' ', l.full_name, l.phone, l.phone2, l.email, l.city, owner.name)
                  ilike '%' || $9 || '%'
              )
            order by l.created_at desc, l.full_name asc
            limit $10
          `,
          [
            unit.id,
            stage,
            ownerId,
            courseId,
            turmaId,
            channelId,
            dateFrom,
            dateTo,
            search,
            MAX_EXPORT_ROWS + 1,
          ],
        );

        if (result.rows.length > MAX_EXPORT_ROWS) {
          return Response.json(
            {
              error: `A exportação ultrapassa ${MAX_EXPORT_ROWS.toLocaleString("pt-BR")} leads. Refine os filtros.`,
            },
            { status: 413 },
          );
        }

        const csv = createSemicolonCsv(
          [
            "Nome",
            "Telefone",
            "WhatsApp / telefone 2",
            "E-mail",
            "Cidade",
            "Curso",
            "Turma",
            "Canal de aquisição",
            "Campanha",
            "ID do formulário",
            "Responsável",
            "Etapa",
            "Etapa do aluno",
            "Observações",
            "Criado em",
          ],
          result.rows.map((lead) => [
            lead.full_name,
            lead.phone,
            lead.phone2,
            lead.email,
            lead.city,
            lead.course_name,
            lead.turma_name,
            lead.acquisition_channel_name,
            lead.campaign_name,
            lead.form_id,
            lead.owner_name,
            lead.stage,
            lead.student_stage,
            lead.observations,
            lead.created_at,
          ]),
        );
        const dateParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .formatToParts(new Date())
          .reduce<Record<string, string>>((parts, part) => {
            if (part.type !== "literal") parts[part.type] = part.value;
            return parts;
          }, {});
        const day = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
        const fileName = `leads-${csvFileSlug(unit.name)}-${day}.csv`;

        return new Response(csv, {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}"`,
            "X-Exported-Rows": String(result.rows.length),
          },
        });
      },
    },
  },
});
