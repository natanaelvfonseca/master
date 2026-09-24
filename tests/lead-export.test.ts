import assert from "node:assert/strict";
import test from "node:test";
import { createSemicolonCsv, csvCell, csvFileSlug } from "../src/lib/lead-export.ts";

test("escapes quotes and spreadsheet formulas in CSV cells", () => {
  assert.equal(csvCell('Maria "Silva"'), '"Maria ""Silva"""');
  assert.equal(csvCell("=2+2"), '"\'=2+2"');
  assert.equal(csvCell(null), '""');
});

test("creates an Excel-friendly semicolon CSV", () => {
  assert.equal(
    createSemicolonCsv(["Nome", "Telefone"], [["Ana", "31999999999"]]),
    '\uFEFF"Nome";"Telefone"\r\n"Ana";"31999999999"\r\n',
  );
});

test("creates a safe unit slug for the exported filename", () => {
  assert.equal(csvFileSlug("LEÃO - BH"), "leao-bh");
});
