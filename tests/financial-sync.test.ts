import assert from "node:assert/strict";
import test from "node:test";
import {
  FINANCIAL_PILOT_CLASS_LIMIT,
  financialSyncClassCount,
  financialSyncRequest,
  safeFinancialSyncError,
} from "../src/lib/financial-sync.ts";

test("piloto limita a sincronização sem alterar a carga completa", () => {
  assert.deepEqual(financialSyncRequest({ pilot: true }), {
    mode: "pilot",
    classLimit: FINANCIAL_PILOT_CLASS_LIMIT,
  });
  assert.deepEqual(financialSyncRequest({}), { mode: "full", classLimit: null });
  assert.equal(financialSyncClassCount(899, "pilot", 3), 3);
  assert.equal(financialSyncClassCount(2, "pilot", 3), 2);
  assert.equal(financialSyncClassCount(899, "full", null), 899);
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
