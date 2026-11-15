import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { recoverRecentMetaFormLeads, recoverStoredMetaEvents } from "@/lib/server/meta-leads";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const expected = cronSecret ? `Bearer ${cronSecret}` : "";

  if (!expected || authorization.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}

export const Route = createFileRoute("/api/cron/meta-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) {
          return Response.json({ ok: false, error: "Não autorizado." }, { status: 401 });
        }

        // Evento recebido sem field_data durante falha de token fica salvo no banco.
        // Primeiro retoma o backlog, depois varre a janela recente da Graph API.
        const query = new URL(request.url).searchParams;
        const requestedSince = query.get('since');
        const earliestAllowed = Date.now() - 7 * 24 * 60 * 60 * 1_000;
        const parsedSince = requestedSince ? Date.parse(requestedSince) : Number.NaN;
        const since = new Date(
          Number.isFinite(parsedSince)
            ? Math.max(earliestAllowed, Math.min(parsedSince, Date.now()))
            : Date.now() - 48 * 60 * 60 * 1_000,
        ).toISOString();
        const backlogOnly = query.get('mode') === 'backlog';

        try {
          const backlogBatchLimit = backlogOnly ? 400 : 120;
          const stored = await recoverStoredMetaEvents(backlogBatchLimit);
          if (stored.authRequired) {
            return Response.json(
              { ok: false, error: "Token da Página Meta inválido. É necessário reconectar a Página.", stored },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            );
          }
          if (backlogOnly || stored.found >= backlogBatchLimit) {
            return Response.json(
              {
                ok: stored.failed === 0,
                result: { stored, backlogRemaining: stored.found >= backlogBatchLimit },
              },
              {
                status: stored.failed ? 503 : 200,
                headers: { 'Cache-Control': 'no-store' },
              },
            );
          }
          const recent = await recoverRecentMetaFormLeads(since);
          const result = { stored, recent };
          if (recent.failed > 0 || stored.failed > 0) {
            return Response.json(
              { ok: false, error: "A recuperação de leads teve falhas parciais.", result },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            );
          }
          return Response.json(
            { ok: true, result },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Falha na recuperação automática.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
