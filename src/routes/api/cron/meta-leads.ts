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
        const since = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString();

        try {
          const stored = await recoverStoredMetaEvents(80);
          if (stored.authRequired) {
            return Response.json(
              { ok: false, error: "Token da Página Meta inválido. É necessário reconectar a Página.", stored },
              { status: 503, headers: { "Cache-Control": "no-store" } },
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
