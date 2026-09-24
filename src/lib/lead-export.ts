const dangerousSpreadsheetPrefix = /^[=+\-@\t\r]/;

export function sanitizeSpreadsheetCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return dangerousSpreadsheetPrefix.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  const safe = sanitizeSpreadsheetCell(value).replace(/"/g, '""');
  return `"${safe}"`;
}

export function createSemicolonCsv(headers: Array<string>, rows: Array<Array<unknown>>) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvFileSlug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unidade"
  );
}
