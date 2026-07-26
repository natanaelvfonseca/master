import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { recoverRecentMetaFormLeads } from "@/lib/server/meta-leads";

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

        // A janela maior evita perdas em indisponibilidades temporárias. A rotina
        // deduplica pelo leadgen_id e só cria no CRM o que ainda estiver ausente.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();

        try {
          const result = await recoverRecentMetaFormLeads(since);

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
