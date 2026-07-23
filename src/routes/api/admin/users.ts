import { createFileRoute } from "@tanstack/react-router";
import type { QueryResultRow } from "pg";
import {
  canDeleteManagedUser,
  canDeleteUsers,
  canEditManagedUser,
  canEditUsers,
  isMasterRole,
  type ManagedUser,
  type UserRole,
} from "@/lib/auth-types";
import {
  canAssignRole,
  ensureUserProfileSchema,
  getSessionFromRequest,
  hashPassword,
  isValidRole,
  sanitizeEmail,
} from "@/lib/server/auth";
import { queryDb, withTransaction } from "@/lib/server/db";

type ManagedUserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  status: "active" | "inactive";
  unit_id: string;
  unit_name: string;
  created_at: string;
};

function mapManagedUser(row: ManagedUserRow): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    unitId: row.unit_id,
    unitName: row.unit_name,
    createdAt: row.created_at,
  };
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function parseCsvLine(line: string, delimiter: string) {
  const values: Array<string> = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseUsersCsv(csvText: string) {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("Arquivo CSV vazio.");

  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const headers = parseCsvLine(firstLine, delimiter).map((header) => header.trim());
  if (headers.join("|") !== "Nome|Telefone|Email") {
    throw new Error("O cabeçalho deve ser exatamente: Nome, Telefone, Email.");
  }

  return lines.slice(1).map((line, index) => {
    const [name = "", phone = "", email = ""] = parseCsvLine(line, delimiter);
    return { row: index + 2, name: name.trim(), phone: phone.trim(), email: sanitizeEmail(email) };
  });
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!session.canRegisterUsers || !session.activeUnit) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        await ensureUserProfileSchema();

        const result = await queryDb<ManagedUserRow>(
          `
            select
              u.id,
              u.email,
              u.name,
              u.phone,
              u.role,
              u.status,
              au.id as unit_id,
              au.name as unit_name,
              u.created_at::text
            from app_users u
            inner join app_units au on au.id = $1
            where (u.primary_unit_id = $1 or exists (
              select 1 from app_user_units uu where uu.user_id = u.id and uu.unit_id = $1
            ))
              and u.status = 'active'
              and ($2::boolean or u.role <> 'DEV')
            order by
              case u.role
                when 'DEV' then 1
                when 'CEO' then 2
                when 'CVO' then 2
                when 'DIRETOR' then 3
                when 'GERENTE' then 4
                else 5
              end,
              u.name asc
          `,
          [session.activeUnit.id, isMasterRole(session.user.role)],
        );

        return Response.json(
          { users: result.rows.map(mapManagedUser) },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!session.canRegisterUsers || !session.activeUnit) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = await request.json().catch(() => null);
        await ensureUserProfileSchema();
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? sanitizeEmail(body.email) : "";
        const password = typeof body?.password === "string" ? body.password : "";
        const role = typeof body?.role === "string" ? body.role : "";
        const requestedUnitId = typeof body?.unitId === "string" ? body.unitId.trim() : "";
        const canChooseUnit =
          isMasterRole(session.user.role) ||
          ["CEO", "MARKETING"].includes(session.user.role);
        const unitId = canChooseUnit
          ? requestedUnitId || session.activeUnit.id
          : session.activeUnit.id;

        if (body?.action === "importUsers") {
          const csvText = typeof body?.csvText === "string" ? body.csvText : "";
          const importRole = typeof body?.role === "string" ? body.role : "";
          const importPassword = typeof body?.password === "string" ? body.password : "";

          if (!csvText || importPassword.length < 8 || !isValidRole(importRole)) {
            return Response.json({ ok: false, error: "Dados da importação inválidos." }, { status: 400 });
          }
          if (!canAssignRole(session.user.role, importRole)) {
            return Response.json({ ok: false, error: "Função não permitida." }, { status: 403 });
          }

          const selectedUnit = session.units.find((unit) => unit.id === unitId);
          if (!selectedUnit) {
            return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
          }

          let rows: ReturnType<typeof parseUsersCsv>;
          try {
            rows = parseUsersCsv(csvText);
          } catch (error) {
            return Response.json(
              { ok: false, error: error instanceof Error ? error.message : "CSV inválido." },
              { status: 400 },
            );
          }
          if (!rows.length || rows.length > 2000) {
            return Response.json(
              { ok: false, error: rows.length ? "O limite é de 2.000 usuários por arquivo." : "O CSV não possui usuários." },
              { status: 400 },
            );
          }

          const passwordHash = await hashPassword(importPassword);
          const result = await withTransaction(async (client) => {
            let created = 0;
            let linked = 0;
            let skipped = 0;
            const errors: Array<{ row: number; error: string }> = [];

            for (const row of rows) {
              if (!row.name || !row.phone || !row.email || !row.email.includes("@")) {
                errors.push({ row: row.row, error: "Nome, Telefone e Email são obrigatórios." });
                continue;
              }

              const existing = await client.query<{ id: string }>(
                `select id from app_users where lower(email) = lower($1) limit 1`,
                [row.email],
              );
              const existingUser = existing.rows[0];

              if (existingUser) {
                await client.query(
                  `update app_users set phone = coalesce(nullif(phone, ''), $2), updated_at = now() where id = $1`,
                  [existingUser.id, row.phone],
                );
                const association = await client.query(
                  `insert into app_user_units (user_id, unit_id) values ($1, $2) on conflict do nothing`,
                  [existingUser.id, selectedUnit.id],
                );
                if (association.rowCount) linked += 1;
                else skipped += 1;
                continue;
              }

              const inserted = await client.query<{ id: string }>(
                `
                  insert into app_users (name, phone, email, role, primary_unit_id, password_hash, created_by)
                  values ($1, $2, $3, $4, $5, $6, $7)
                  returning id
                `,
                [row.name, row.phone, row.email, importRole, selectedUnit.id, passwordHash, session.user.id],
              );
              await client.query(
                `insert into app_user_units (user_id, unit_id) values ($1, $2) on conflict do nothing`,
                [inserted.rows[0].id, selectedUnit.id],
              );
              created += 1;
            }

            return { created, linked, skipped, errors };
          });

          return Response.json({ ok: true, ...result }, { status: 201 });
        }

        if (!name || !email || password.length < 8 || !isValidRole(role)) {
          return Response.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
        }

        if (!canAssignRole(session.user.role, role)) {
          return Response.json({ ok: false, error: "Função não permitida." }, { status: 403 });
        }

        const selectedUnit = session.units.find((unit) => unit.id === unitId);

        if (!selectedUnit) {
          return Response.json({ ok: false, error: "Unidade indisponível." }, { status: 403 });
        }

        if (!canChooseUnit && unitId !== session.activeUnit.id) {
          return Response.json({ ok: false, error: "Unidade não permitida." }, { status: 403 });
        }

        try {
          const passwordHash = await hashPassword(password);
          const created = await withTransaction(async (client) => {
            const userResult = await client.query<ManagedUserRow>(
              `
                insert into app_users (name, email, role, primary_unit_id, password_hash, created_by)
                values ($1, $2, $3, $4, $5, $6)
                returning
                  id,
                  email,
                  name,
                  phone,
                  role,
                  status,
                  primary_unit_id as unit_id,
                  (select name from app_units where id = $4) as unit_name,
                  created_at::text
              `,
              [name, email, role, selectedUnit.id, passwordHash, session.user.id],
            );
            const user = userResult.rows[0];

            await client.query(
              `
                insert into app_user_units (user_id, unit_id)
                values ($1, $2)
                on conflict do nothing
              `,
              [user.id, selectedUnit.id],
            );

            return user;
          });

          return Response.json({ user: mapManagedUser(created) }, { status: 201 });
        } catch (error) {
          if (isUniqueError(error)) {
            return Response.json({ ok: false, error: "Email já cadastrado." }, { status: 409 });
          }

          throw error;
        }
      },
      PUT: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!session.activeUnit || !canEditUsers(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = await request.json().catch(() => null);
        const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? sanitizeEmail(body.email) : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!userId || !name || !email || (password && password.length < 8)) {
          return Response.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
        }

        const targetResult = await queryDb<ManagedUserRow>(
          `
            select
              u.id,
              u.email,
              u.name,
              u.phone,
              u.role,
              u.status,
              au.id as unit_id,
              au.name as unit_name,
              u.created_at::text
            from app_users u
            inner join app_units au on au.id = u.primary_unit_id
            where u.id = $1
              and u.status = 'active'
            limit 1
          `,
          [userId],
        );
        const target = targetResult.rows[0];

        if (!target) {
          return Response.json({ ok: false, error: "Usuário não encontrado." }, { status: 404 });
        }

        if (target.unit_id !== session.activeUnit.id) {
          return Response.json(
            { ok: false, error: "Usuário fora da unidade ativa." },
            { status: 403 },
          );
        }

        if (!canEditManagedUser(session.user.role, target.role)) {
          return Response.json(
            { ok: false, error: "Você não pode editar este usuário." },
            { status: 403 },
          );
        }

        try {
          const passwordHash = password ? await hashPassword(password) : null;
          const updated = await withTransaction(async (client) => {
            const userResult = await client.query<ManagedUserRow>(
              `
                update app_users
                set
                  name = $2,
                  email = $3,
                  password_hash = coalesce($4, password_hash),
                  updated_at = now()
                where id = $1
                returning
                  id,
                  email,
                  name,
                  phone,
                  role,
                  status,
                  primary_unit_id as unit_id,
                  (select name from app_units where id = primary_unit_id) as unit_name,
                  created_at::text
              `,
              [target.id, name, email, passwordHash],
            );

            if (passwordHash) {
              await client.query(
                `
                  update app_sessions
                  set revoked_at = now()
                  where user_id = $1 and revoked_at is null
                `,
                [target.id],
              );
            }

            return userResult.rows[0];
          });

          return Response.json({ user: mapManagedUser(updated) });
        } catch (error) {
          if (isUniqueError(error)) {
            return Response.json({ ok: false, error: "Email já cadastrado." }, { status: 409 });
          }

          throw error;
        }
      },
      DELETE: async ({ request }) => {
        const session = await getSessionFromRequest(request);

        if (!session) {
          return Response.json({ ok: false, error: "Não autenticado." }, { status: 401 });
        }

        if (!session.activeUnit || !canDeleteUsers(session.user.role)) {
          return Response.json({ ok: false, error: "Acesso negado." }, { status: 403 });
        }

        const body = await request.json().catch(() => null);
        const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

        if (!userId) {
          return Response.json({ ok: false, error: "Usuário inválido." }, { status: 400 });
        }

        if (userId === session.user.id) {
          return Response.json(
            { ok: false, error: "Você não pode excluir o próprio usuário." },
            { status: 403 },
          );
        }

        const targetResult = await queryDb<ManagedUserRow>(
          `
            select
              u.id,
              u.email,
              u.name,
              u.phone,
              u.role,
              u.status,
              au.id as unit_id,
              au.name as unit_name,
              u.created_at::text
            from app_users u
            inner join app_units au on au.id = u.primary_unit_id
            where u.id = $1
            limit 1
          `,
          [userId],
        );

        const target = targetResult.rows[0];

        if (!target) {
          return Response.json({ ok: false, error: "Usuário não encontrado." }, { status: 404 });
        }

        if (target.unit_id !== session.activeUnit.id) {
          return Response.json(
            { ok: false, error: "Usuário fora da unidade ativa." },
            { status: 403 },
          );
        }

        if (!canDeleteManagedUser(session.user.role, target.role)) {
          return Response.json(
            { ok: false, error: "Você não pode excluir este usuário." },
            { status: 403 },
          );
        }

        await queryDb("delete from app_users where id = $1", [target.id]);

        return Response.json({ ok: true });
      },
    },
  },
});
