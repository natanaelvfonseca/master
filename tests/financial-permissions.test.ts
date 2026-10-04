import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageFinancialIntegration,
  canManageFinancialWhatsApp,
  canViewFinancial,
} from "../src/lib/auth-types.ts";

test("direção e gerência acessam a operação financeira", () => {
  for (const role of ["DEV", "CVO", "CEO", "DIRETOR", "GERENTE"] as const) {
    assert.equal(canViewFinancial(role), true);
  }
  for (const role of ["MARKETING", "CONSULTOR"] as const) {
    assert.equal(canViewFinancial(role), false);
  }
});

test("token CAEZ continua restrito à administração", () => {
  assert.equal(canManageFinancialIntegration("DEV"), true);
  assert.equal(canManageFinancialIntegration("CVO"), true);
  assert.equal(canManageFinancialIntegration("CEO"), true);
  assert.equal(canManageFinancialIntegration("DIRETOR"), false);
  assert.equal(canManageFinancialIntegration("GERENTE"), false);
});

test("WhatsApp financeiro pode ser operado pela liderança da unidade", () => {
  for (const role of ["DEV", "CVO", "CEO", "DIRETOR", "GERENTE"] as const) {
    assert.equal(canManageFinancialWhatsApp(role), true);
  }
  for (const role of ["MARKETING", "CONSULTOR"] as const) {
    assert.equal(canManageFinancialWhatsApp(role), false);
  }
});
