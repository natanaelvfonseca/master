import assert from "node:assert/strict";
import test from "node:test";
import { canManageLeadFiles, type UserRole } from "../src/lib/auth-types.ts";

test("allows the requested roles to import and export leads", () => {
  const allowed: Array<UserRole> = ["DEV", "CEO", "DIRETOR", "GERENTE", "MARKETING"];
  allowed.forEach((role) => assert.equal(canManageLeadFiles(role), true, role));
});

test("keeps lead file management unavailable to other roles", () => {
  const denied: Array<UserRole> = ["CVO", "CONSULTOR"];
  denied.forEach((role) => assert.equal(canManageLeadFiles(role), false, role));
});
