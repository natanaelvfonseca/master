import type { AuthSession, UnitSummary } from "@/lib/auth-types";
import { getUnitFromBody, getUnitFromRequest } from "@/lib/server/commercial-schema";

export function financialUnitFromRequest(
  session: AuthSession,
  request: Request,
): UnitSummary | null {
  const params = new URL(request.url).searchParams;
  const unitId = params.get("unit_id")?.trim() || params.get("unitId")?.trim();
  if (!unitId) return getUnitFromRequest(session, request);
  return getUnitFromBody(session, unitId);
}

export function financialUnitFromBody(
  session: AuthSession,
  body: Record<string, unknown> | null,
): UnitSummary | null {
  const raw = body?.unit_id ?? body?.unitId;
  return getUnitFromBody(session, raw);
}

export function financialError(error: unknown) {
  return error instanceof Error ? error.message : "Falha na operação financeira.";
}
