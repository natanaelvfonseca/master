import assert from "node:assert/strict";
import test from "node:test";
import {
  brazilianPhoneHref,
  brazilianWhatsAppHref,
  closedMonthsRange,
  filterFinancialQueue,
} from "../src/lib/financial-operations.ts";

test("cria links brasileiros sem texto automático", () => {
  assert.equal(brazilianWhatsAppHref("(71) 99999-1234"), "https://wa.me/5571999991234");
  assert.equal(brazilianWhatsAppHref("+55 71 99999-1234"), "https://wa.me/5571999991234");
  assert.equal(brazilianPhoneHref("(71) 99999-1234"), "tel:+5571999991234");
  assert.equal(brazilianWhatsAppHref(null), null);
});

test("segmenta a fila operacional", () => {
  const rows = [
    { id: 1, score: 90, phone: "71999991234", responsible_phone: null, last_contact_at: null, promised_date: null },
    { id: 2, score: 20, phone: null, responsible_phone: null, last_contact_at: "2026-10-01", promised_date: "2026-10-02" },
  ];
  assert.deepEqual(filterFinancialQueue(rows, "priority", "2026-10-03").map((row) => row.id), [1]);
  assert.deepEqual(filterFinancialQueue(rows, "no_contact", "2026-10-03").map((row) => row.id), [1]);
  assert.deepEqual(filterFinancialQueue(rows, "broken_promise", "2026-10-03").map((row) => row.id), [2]);
  assert.deepEqual(filterFinancialQueue(rows, "no_phone", "2026-10-03").map((row) => row.id), [2]);
});

test("calcula os últimos meses fechados", () => {
  assert.deepEqual(closedMonthsRange("2026-10-03", 3), ["2026-07-01", "2026-09-30"]);
  assert.deepEqual(closedMonthsRange("2026-01-10", 3), ["2025-10-01", "2025-12-31"]);
});
