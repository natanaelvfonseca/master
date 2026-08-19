import { createHash } from "node:crypto";
import { createServerOnlyFn } from "@tanstack/react-start";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  var __masterDbPool: Pool | undefined;
}

// Star and Master share the same Plenarius database. Using the same advisory
// lock serializes schema maintenance across both Vercel projects.
const RUNTIME_SCHEMA_LOCK_KEY = "star_profissoes:runtime_schema";

const getDatabaseUrl = createServerOnlyFn(() => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return databaseUrl;
});

const getDbPool = createServerOnlyFn(async () => {
  if (globalThis.__masterDbPool) {
    return globalThis.__masterDbPool;
  }

  const { Pool } = await import("pg");

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    max: 5,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error", error);
  });

  globalThis.__masterDbPool = pool;
  return pool;
});

export async function queryDb<TRow extends QueryResultRow = QueryResultRow>(
  text: string,
  values: ReadonlyArray<unknown> = [],
): Promise<QueryResult<TRow>> {
  const pool = await getDbPool();

  return pool.query<TRow>(text, [...values]);
}

export function isTransientDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const transientCodes = new Set([
    "08000",
    "08001",
    "08003",
    "08004",
    "08006",
    "08007",
    "08P01",
    "57P01",
    "57P02",
    "57P03",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
  ]);

  return (
    transientCodes.has(code) ||
    /connection|connect|timeout|terminating connection/i.test(error.message)
  );
}

export async function ensureRuntimeSchema(schemaKey: string, sql: string) {
  const schemaVersion = createHash("sha256").update(sql).digest("hex");

  await withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [RUNTIME_SCHEMA_LOCK_KEY]);
    await client.query(`
      create table if not exists app_runtime_schema_versions (
        schema_key text not null,
        schema_version text not null,
        applied_at timestamptz not null default now(),
        primary key (schema_key, schema_version)
      )
    `);

    const applied = await client.query(
      `select 1 from app_runtime_schema_versions
       where schema_key = $1 and schema_version = $2
       limit 1`,
      [schemaKey, schemaVersion],
    );

    if (applied.rowCount) {
      return;
    }

    await client.query(sql);
    await client.query(
      `insert into app_runtime_schema_versions (schema_key, schema_version)
       values ($1, $2)
       on conflict do nothing`,
      [schemaKey, schemaVersion],
    );
  });
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await getDbPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
