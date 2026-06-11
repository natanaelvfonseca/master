import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import type { UserRole } from "@/lib/auth-types";
import {
  createSessionCookie,
  createSessionForUser,
  sanitizeEmail,
  verifyPassword,
} from "@/lib/server/auth";
import { queryDb } from "@/lib/server/db";

type LoginUserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  primary_unit_id: string;
  password_hash: string;
};

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const email = typeof body?.email === "string" ? sanitizeEmail(body.email) : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!email || !password) {
          return Response.json({ ok: false, error: "Informe email e senha." }, { status: 400 });
        }

        const result = await queryDb<LoginUserRow>(
          `
            select id, email, name, role, primary_unit_id, password_hash
            from app_users
            where lower(email) = lower($1) and status = 'active'
            limit 1
          `,
          [email],
        );
        const user = result.rows[0];

        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return Response.json({ ok: false, error: "Credenciais invalidas." }, { status: 401 });
        }

        const { token, expiresAt } = await createSessionForUser(
          user.id,
          user.role,
          user.primary_unit_id,
        );

        return Response.json(
          { ok: true },
          {
            headers: {
              "Set-Cookie": createSessionCookie(token, expiresAt),
            },
          },
        );
      },
    },
  },
});
