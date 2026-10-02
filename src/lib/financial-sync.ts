export const FINANCIAL_PILOT_CLASS_LIMIT = 3;

export type FinancialSyncMode = "full" | "pilot";

export function financialSyncRequest(body: Record<string, unknown> | null) {
  const mode: FinancialSyncMode = body?.pilot === true ? "pilot" : "full";
  return {
    mode,
    classLimit: mode === "pilot" ? FINANCIAL_PILOT_CLASS_LIMIT : null,
  };
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
