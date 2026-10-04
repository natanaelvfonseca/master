import { createFileRoute } from "@tanstack/react-router";
import { canManageFinancialWhatsApp, canViewFinancial } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import {
  financialError,
  financialUnitFromBody,
  financialUnitFromRequest,
} from "@/lib/server/financial-auth";
import {
  connectFinancialEvolution,
  disconnectFinancialEvolution,
  getFinancialEvolutionState,
} from "@/lib/server/evolution-whatsapp";

export const Route = createFileRoute("/api/financeiro/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canViewFinancial(session.user.role))
          return Response.json({ error: "Acesso negado." }, { status: 403 });
        const unit = financialUnitFromRequest(session, request);
        if (!unit) return Response.json({ error: "Unidade inválida." }, { status: 403 });

        return Response.json(await getFinancialEvolutionState(unit.id), {
          headers: { "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);
        if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });
        if (!canManageFinancialWhatsApp(session.user.role))
          return Response.json({ error: "Acesso negado." }, { status: 403 });
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const unit = financialUnitFromBody(session, body);
        if (!unit) return Response.json({ error: "Unidade inválida." }, { status: 403 });

        try {
          if (body?.action === "connect") {
            return Response.json({
              ok: true,
              ...(await connectFinancialEvolution(unit, session.user.id, request.url)),
            });
          }
          if (body?.action === "disconnect") {
            await disconnectFinancialEvolution(unit.id);
            return Response.json({ ok: true });
          }
          return Response.json({ error: "Ação inválida." }, { status: 400 });
        } catch (error) {
          return Response.json({ error: financialError(error) }, { status: 400 });
        }
      },
    },
  },
});
