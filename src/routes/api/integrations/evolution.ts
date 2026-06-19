import { createFileRoute } from "@tanstack/react-router";
import { canOperateCrm, canViewManagement } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import {
  connectEvolution,
  disconnectEvolution,
  getEvolutionState,
  listEvolutionMessages,
  sendEvolutionMessage,
} from "@/lib/server/evolution-whatsapp";

async function requireSession(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.activeUnit) {
    return { response: Response.json({ ok: false, error: "Não autenticado." }, { status: 401 }) };
  }
  if (!canOperateCrm(session.user.role)) {
    return { response: Response.json({ ok: false, error: "Acesso negado." }, { status: 403 }) };
  }
  return { session, activeUnit: session.activeUnit };
}

export const Route = createFileRoute("/api/integrations/evolution")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireSession(request);
        if ("response" in auth) return auth.response;

        const url = new URL(request.url);
        const remoteJid = url.searchParams.get("remoteJid");
        if (remoteJid) {
          const messages = await listEvolutionMessages(auth.activeUnit.id, remoteJid);
          return Response.json(
            { ok: true, messages },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        const state = await getEvolutionState(auth.activeUnit.id, request.url);
        return Response.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const auth = await requireSession(request);
        if ("response" in auth) return auth.response;

        const body = (await request.json().catch(() => null)) as {
          action?: string;
          remoteJid?: string;
          text?: string;
        } | null;

        try {
          if (body?.action === "connect") {
            if (!canViewManagement(auth.session.user.role)) {
              return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
            }
            const result = await connectEvolution(
              auth.activeUnit,
              auth.session.user.id,
              request.url,
            );
            return Response.json({ ok: true, ...result });
          }

          if (body?.action === "disconnect") {
            if (!canViewManagement(auth.session.user.role)) {
              return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
            }
            await disconnectEvolution(auth.activeUnit.id);
            return Response.json({ ok: true });
          }

          if (body?.action === "send") {
            await sendEvolutionMessage(
              auth.activeUnit.id,
              String(body.remoteJid ?? ""),
              String(body.text ?? ""),
            );
            return Response.json({ ok: true });
          }

          return Response.json({ ok: false, error: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Falha na integração." },
            { status: 400 },
          );
        }
      },
    },
  },
});
