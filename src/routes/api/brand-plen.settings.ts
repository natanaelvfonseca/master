import { createFileRoute } from "@tanstack/react-router";
import { canManageBrandPlen } from "@/lib/auth-types";
import { getSessionFromRequest } from "@/lib/server/auth";
import { getUnitFromBody, getUnitFromRequest } from "@/lib/server/commercial-schema";
import {
  getBrandPlenSettings,
  sanitizeBrandPlenSettingsInput,
  saveBrandPlenSettings,
} from "@/lib/server/brand-plen-settings";

export const Route = createFileRoute("/api/brand-plen/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!canManageBrandPlen(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const unit = getUnitFromRequest(session, request);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        return Response.json(
          { settings: await getBrandPlenSettings(unit.id) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      PUT: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!canManageBrandPlen(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as {
          unitId?: unknown;
          settings?: unknown;
        } | null;
        const unit = getUnitFromBody(session, body?.unitId);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        const input = sanitizeBrandPlenSettingsInput(body?.settings, unit.id);
        const settings = await saveBrandPlenSettings(unit.id, session.user.id, input);

        return Response.json(
          { settings: { ...settings, updatedByName: session.user.name } },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
