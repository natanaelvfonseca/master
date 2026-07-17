import { createFileRoute } from "@tanstack/react-router";
import { getMetaIntegration, receiveMetaWebhook } from "@/lib/server/meta-leads";

export const Route = createFileRoute("/api/webhooks/meta-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const integration = await getMetaIntegration();
        const expectedToken = process.env.META_VERIFY_TOKEN || integration.verify_token;

        if (mode === "subscribe" && token && expectedToken && token === expectedToken && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        return Response.json({ ok: false, error: "Verificação inválida." }, { status: 403 });
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const result = await receiveMetaWebhook(rawBody, request.headers.get("x-hub-signature-256"));

        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: result.status });
        }

        return Response.json({ ok: true, result: result.result, leadId: result.leadId ?? null });
      },
    },
  },
});
