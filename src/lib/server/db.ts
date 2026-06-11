import { createServerOnlyFn } from "@tanstack/react-start";
import type { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  var __plenariusDbPool: Pool | undefined;
}

const getDatabaseUrl = createServerOnlyFn(() => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return databaseUrl;
});

const getDbPool = createServerOnlyFn(async () => {
  if (globalThis.__plenariusDbPool) {
    return globalThis.__plenariusDbPool;
  }

  const { Pool } = await import("pg");

  globalThis.__plenariusDbPool = new Pool({
    connectionString: getDatabaseUrl(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 5,
  });

  return globalThis.__plenariusDbPool;
});

export async function queryDb<TRow extends QueryResultRow = QueryResultRow>(
  text: string,
  values: ReadonlyArray<unknown> = [],
): Promise<QueryResult<TRow>> {
  const pool = await getDbPool();

  return pool.query<TRow>(text, [...values]);
}
