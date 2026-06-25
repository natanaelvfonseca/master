import { createFileRoute } from "@tanstack/react-router";
import { listAttendanceConsultants, requireAttendanceAccess } from "@/lib/server/attendances";
import { getSessionFromRequest } from "@/lib/server/auth";

export const Route = createFileRoute("/api/atendimentos/consultores")({
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
        const unitId = url.searchParams.get("unitId") ?? undefined;
        const data = await listAttendanceConsultants(session, unitId);

        if (!data) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        return Response.json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
