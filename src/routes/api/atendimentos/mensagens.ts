import { createFileRoute } from "@tanstack/react-router";
import { listAttendanceMessages, requireAttendanceAccess } from "@/lib/server/attendances";
import { getSessionFromRequest } from "@/lib/server/auth";

export const Route = createFileRoute("/api/atendimentos/mensagens")({
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
        const data = await listAttendanceMessages(session, {
          consultantId: url.searchParams.get("consultantId") ?? "",
          unitId: url.searchParams.get("unitId"),
          remoteJid: url.searchParams.get("remoteJid") ?? "",
          limit: url.searchParams.get("limit"),
          offset: url.searchParams.get("offset"),
        });

        if (!data) {
          return Response.json(
            { ok: false, error: "Conversa, consultor ou unidade indisponível." },
            { status: 404 },
          );
        }

        return Response.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
