import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCIAL_PILOT_CLASS_LIMIT,
  financialSyncClassCount,
  financialSyncRequest,
  isoDateToCaezDate,
  safeFinancialSyncError,
} from "../src/lib/financial-sync.ts";

test("piloto limita a sincronização sem alterar a carga completa", () => {
  assert.deepEqual(financialSyncRequest({ pilot: true }), {
    mode: "pilot",
    classLimit: FINANCIAL_PILOT_CLASS_LIMIT,
    periodStart: null,
    periodEnd: null,
  });
  assert.deepEqual(financialSyncRequest({}), {
    mode: "full",
    classLimit: null,
    periodStart: null,
    periodEnd: null,
  });
  assert.equal(financialSyncClassCount(899, "pilot", 3), 3);
  assert.equal(financialSyncClassCount(2, "pilot", 3), 2);
  assert.equal(financialSyncClassCount(899, "full", null), 899);
});

test("aceita um período fechado e converte datas para o contrato CAEZ", () => {
  assert.deepEqual(financialSyncRequest({ startDate: "2026-07-01", endDate: "2026-09-30" }), {
    mode: "full",
    classLimit: null,
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
  });
  assert.equal(isoDateToCaezDate("2026-07-01"), "01/07/2026");
  assert.throws(() => financialSyncRequest({ startDate: "2026-07-01" }), /início e o fim/);
  assert.throws(
    () => financialSyncRequest({ startDate: "2026-09-30", endDate: "2026-07-01" }),
    /posterior/,
  );
});

test("diagnóstico remove documentos e identificadores sensíveis", () => {
  const safe = safeFinancialSyncError(
    new Error("CPF 12345678901 no token aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
  );
  assert.equal(safe.includes("12345678901"), false);
  assert.equal(safe.includes("aaaaaaaa"), false);
  assert.match(safe, /\[documento\]/);
  assert.match(safe, /\[identificador\]/);
});
