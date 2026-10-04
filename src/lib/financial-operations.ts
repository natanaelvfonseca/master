export type FinancialQueueView = "all" | "priority" | "no_contact" | "broken_promise" | "no_phone";

export type FinancialQueueItem = {
  score: number;
  phone: string | null;
  responsible_phone: string | null;
  last_contact_at: string | null;
  promised_date: string | null;
};

export function financialContactPhone(item: Pick<FinancialQueueItem, "phone" | "responsible_phone">) {
  return item.responsible_phone || item.phone || null;
}

export function brazilianWhatsAppHref(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length >= 11) digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13 || !digits.startsWith("55")) return null;
  return `https://wa.me/${digits}`;
}

export function brazilianPhoneHref(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`;
}

export function filterFinancialQueue<T extends FinancialQueueItem>(
  rows: Array<T>,
  view: FinancialQueueView,
  today: string,
) {
  if (view === "priority") return rows.filter((row) => row.score >= 80);
  if (view === "no_contact") return rows.filter((row) => !row.last_contact_at);
  if (view === "broken_promise")
    return rows.filter((row) => Boolean(row.promised_date && row.promised_date < today));
  if (view === "no_phone") return rows.filter((row) => !financialContactPhone(row));
  return rows;
}

export function closedMonthsRange(today: string, months: number) {
  const current = new Date(`${today}T12:00:00`);
  const start = new Date(current.getFullYear(), current.getMonth() - months, 1, 12);
  const end = new Date(current.getFullYear(), current.getMonth(), 0, 12);
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return [format(start), format(end)] as const;
}
