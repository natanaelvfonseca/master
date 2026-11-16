import assert from "node:assert/strict";
import test from "node:test";
import { canManageLeadFiles, USER_ROLES } from "../src/lib/auth-types.ts";

test("allows every role except consultants to import and export leads", () => {
  USER_ROLES.forEach((role) => {
    assert.equal(canManageLeadFiles(role), role !== "CONSULTOR", role);
  });
});

test("keeps import and export unavailable to consultants", () => {
  assert.equal(canManageLeadFiles("CONSULTOR"), false);
});
