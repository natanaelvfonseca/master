import { createFileRoute } from "@tanstack/react-router";
import { canViewManagement, isExecutiveRole, isMasterRole } from "@/lib/auth-types";
import { getUnitFromRequest } from "@/lib/server/commercial-schema";
import {
  listCourseAttendances,
  saveCourseAttendance,
} from "@/lib/server/course-attendances";
import { getSessionFromRequest } from "@/lib/server/auth";

function attendanceError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "Já existe uma turma com o mesmo curso, local e data nesta unidade.";
  }

  return error instanceof Error ? error.message : "Falha ao salvar turma.";
}

async function authorize(request: Request, requestedUnitId: string) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { response: Response.json({ ok: false, error: "Não autenticado." }, { status: 401 }) };
  }

  if (!canViewManagement(session.user.role) || !session.activeUnit) {
    return { response: Response.json({ ok: false, error: "Acesso negado." }, { status: 403 }) };
  }

  const canChooseUnit = isMasterRole(session.user.role) || isExecutiveRole(session.user.role);
  const unitId = canChooseUnit ? requestedUnitId || session.activeUnit.id : session.activeUnit.id;

  if (!session.units.some((unit) => unit.id === unitId)) {
    return { response: Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 }) };
  }

  return { session, unitId };
}

export const Route = createFileRoute("/api/gestao/attendances")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        const unit = getUnitFromRequest(session, request);

        if (!unit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        const data = await listCourseAttendances(unit.id);
        const response = canViewManagement(session.user.role)
          ? data
          : {
              attendances: data.attendances.map((attendance) => ({
                ...attendance,
                consultantIds: [],
                consultantNames: [],
              })),
              consultants: [],
            };

        return Response.json(response, {
          headers: { "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const requestedUnitId = typeof body?.unitId === "string" ? body.unitId : "";
        const auth = await authorize(request, requestedUnitId);

        if ("response" in auth) {
          return auth.response;
        }

        try {
          await saveCourseAttendance({ ...(body ?? {}), unitId: auth.unitId });
          return Response.json({ ok: true }, { status: 201 });
        } catch (error) {
          const message = attendanceError(error);
          const status =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
              ? 409
              : 400;
          return Response.json({ ok: false, error: message }, { status });
        }
      },
      PATCH: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const requestedUnitId = typeof body?.unitId === "string" ? body.unitId : "";
        const auth = await authorize(request, requestedUnitId);

        if ("response" in auth) {
          return auth.response;
        }

        try {
          await saveCourseAttendance({ ...(body ?? {}), unitId: auth.unitId });
          return Response.json({ ok: true });
        } catch (error) {
          return Response.json(
            { ok: false, error: attendanceError(error) },
            { status: 400 },
          );
        }
      },
      DELETE: async ({ request }) => {
        await request.text().catch(() => "");
        return Response.json(
          {
            ok: false,
            error: "Turmas preservam o histórico dos relatórios. Marque a turma como inativa.",
          },
          { status: 405 },
        );
      },
    },
  },
});
