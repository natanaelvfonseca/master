import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { LeadStage } from "@/lib/commercial-types";
import { ensureCommercialSchema, isUuid } from "@/lib/server/commercial-schema";
import { getSessionFromRequest } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type LeadUnitRow = QueryResultRow & {
  unit_id: string;
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
        const nextStage = parseStage(body);

        if (!allowedStages.includes(nextStage as LeadStage)) {
          return Response.json({ ok: false, error: "Estágio inválido." }, { status: 400 });
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
