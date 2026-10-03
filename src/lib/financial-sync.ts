export const FINANCIAL_PILOT_CLASS_LIMIT = 3;

export type FinancialSyncMode = "full" | "pilot";

export class FinancialSyncRequestError extends Error {}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function financialSyncRequest(body: Record<string, unknown> | null) {
  const mode: FinancialSyncMode = body?.pilot === true ? "pilot" : "full";
  const periodStart = typeof body?.startDate === "string" ? body.startDate.trim() : "";
  const periodEnd = typeof body?.endDate === "string" ? body.endDate.trim() : "";
  if (Boolean(periodStart) !== Boolean(periodEnd))
    throw new FinancialSyncRequestError("Informe o início e o fim do período da sincronização.");
  if (periodStart && (!validIsoDate(periodStart) || !validIsoDate(periodEnd)))
    throw new FinancialSyncRequestError("O período da sincronização é inválido.");
  if (periodStart && periodStart > periodEnd)
    throw new FinancialSyncRequestError("A data inicial não pode ser posterior à data final.");
  return {
    mode,
    classLimit: mode === "pilot" ? FINANCIAL_PILOT_CLASS_LIMIT : null,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
  };
}

export function isoDateToCaezDate(value: string) {
  if (!validIsoDate(value)) throw new FinancialSyncRequestError("Data de sincronização inválida.");
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function financialSyncClassCount(
  totalClasses: number,
  mode: FinancialSyncMode,
  classLimit: number | null,
) {
  if (mode !== "pilot" || !classLimit) return totalClasses;
  return Math.min(totalClasses, Math.max(1, classLimit));
}

export function safeFinancialSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha não identificada.";
  return message
    .replace(/\b\d{11}\b|\b\d{14}\b/g, "[documento]")
    .replace(/[A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}/g, "[identificador]")
    .slice(0, 500);
}
