import { createFileRoute } from "@tanstack/react-router";
import { canManageMetaAds, canViewMetaAds } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import {
  duplicateMetaForm,
  listMetaState,
  recoverStoredMetaEvents,
  reprocessMetaEvent,
  subscribeMetaPage,
  syncFormsForPage,
  upsertMetaForm,
  upsertMetaIntegration,
  upsertMetaPage,
  validateMetaPageToken,
} from "@/lib/server/meta-leads";

async function requireAccess(request: Request, write = false) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { response: Response.json({ ok: false, error: "Não autenticado." }, { status: 401 }) };
  }

  if (
    (write && !canManageMetaAds(session.user.role)) ||
    (!write && !canViewMetaAds(session.user.role))
  ) {
    return { response: Response.json({ ok: false, error: "Acesso negado." }, { status: 403 }) };
  }

  return { session };
}

function readAction(body: unknown) {
  const data = body as { action?: unknown };

  return typeof data?.action === "string" ? data.action : "";
}

export const Route = createFileRoute("/api/integrations/meta-ads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAccess(request);

        if ("response" in auth) {
          return auth.response;
        }

        const state = await listMetaState();

        return Response.json(state, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        const auth = await requireAccess(request, true);

        if ("response" in auth) {
          return auth.response;
        }

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        const action = readAction(body);

        try {
          let result: unknown = null;

          if (action === "saveIntegration") {
            await upsertMetaIntegration(body ?? {}, auth.session.user.id);
          } else if (action === "savePage") {
            await upsertMetaPage(body ?? {});
          } else if (action === "saveForm") {
            await upsertMetaForm(body ?? {});
          } else if (action === "duplicateForm") {
            await duplicateMetaForm(body ?? {});
          } else if (action === "validatePageToken") {
            await validateMetaPageToken(String(body?.pageDbId ?? ""));
          } else if (action === "subscribePage") {
            await subscribeMetaPage(String(body?.pageDbId ?? ""));
          } else if (action === "syncForms") {
            await syncFormsForPage(String(body?.pageDbId ?? ""));
          } else if (action === "reprocessEvent") {
            await reprocessMetaEvent(String(body?.eventId ?? ""));
          } else if (action === "recoverStoredEvents") {
            result = await recoverStoredMetaEvents(Number(body?.limit) || 5_000);
          } else {
            return Response.json({ ok: false, error: "Ação inválida." }, { status: 400 });
          }

          return Response.json({ ok: true, result });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Falha na operação." },
            { status: 400 },
          );
        }
      },
    },
  },
});
