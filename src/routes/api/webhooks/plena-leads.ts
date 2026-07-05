import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedPlenaWebhook, receivePlenaLeadWebhook } from "@/lib/server/plena-leads";

export const Route = createFileRoute("/api/webhooks/plena-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedPlenaWebhook(request)) {
          return Response.json({ ok: false, error: "Webhook nao autorizado." }, { status: 401 });
        }

        const payload = await request.json().catch(() => null);

        if (!payload) {
          return Response.json({ ok: false, error: "JSON invalido." }, { status: 400 });
        }

        const result = await receivePlenaLeadWebhook(payload);

        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }

        return Response.json({ ok: true, leadId: result.leadId }, { status: 201 });
      },
    },
  },
});
