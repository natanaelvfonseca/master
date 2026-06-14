import { createFileRoute } from "@tanstack/react-router";
import { getSessionFromRequest, slugifyUnitName } from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type UnitRow = {
  id: string;
  name: string;
  slug: string;
};

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export const Route = createFileRoute("/api/admin/units")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        return Response.json(
          { units: session.units },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!session.canCreateUnits) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = await request.json().catch(() => null);
        const name = typeof body?.name === "string" ? body.name.trim() : "";

        if (name.length < 2) {
          return Response.json({ ok: false, error: "Informe o nome da unidade." }, { status: 400 });
        }

        try {
          const result = await queryDb<UnitRow>(
            `
              insert into app_units (name, slug)
              values ($1, $2)
              returning id, name, slug
            `,
            [name, slugifyUnitName(name)],
          );

          return Response.json({ unit: result.rows[0] }, { status: 201 });
        } catch (error) {
          if (isUniqueError(error)) {
            return Response.json({ ok: false, error: "Unidade já cadastrada." }, { status: 409 });
          }

          throw error;
        }
      },
    },
  },
});
