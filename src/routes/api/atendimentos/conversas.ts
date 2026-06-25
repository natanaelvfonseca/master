import { createFileRoute } from "@tanstack/react-router";
import { listAttendanceConversations, requireAttendanceAccess } from "@/lib/server/attendances";
import { getSessionFromRequest } from "@/lib/server/auth";

export const Route = createFileRoute("/api/atendimentos/conversas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!requireAttendanceAccess(session)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const url = new URL(request.url);
        const data = await listAttendanceConversations(session, {
          consultantId: url.searchParams.get("consultantId") ?? "",
          unitId: url.searchParams.get("unitId"),
          search: url.searchParams.get("search"),
          limit: url.searchParams.get("limit"),
          offset: url.searchParams.get("offset"),
        });

        if (!data) {
          return Response.json(
            { ok: false, error: "Consultor ou unidade indisponível." },
            { status: 404 },
          );
        }

        return Response.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
