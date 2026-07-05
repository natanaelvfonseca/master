import { timingSafeEqual } from "node:crypto";
import type { QueryResultRow } from "pg";
import { isUuid } from "@/lib/server/commercial-schema";
import { queryDb } from "@/lib/server/db";

type PlenaMessage = {
  role?: unknown;
  content?: unknown;
};

type PlenaLeadPayload = {
  source?: unknown;
  page?: unknown;
  lead?: unknown;
  transcript?: unknown;
  created_at?: unknown;
};

type InsertedLeadRow = QueryResultRow & {
  id: string;
};

export type PlenaLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; status: number; error: string };

function limitText(value: unknown, limit: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/<[^>]*>/g, "").trim().slice(0, limit);
}

function normalizeTranscript(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-12)
    .map((message: PlenaMessage) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: limitText(message?.content, 1000),
    }))
    .filter((message) => message.content);
}

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function constantTimeEquals(actual: string, expected: string) {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isAuthorizedPlenaWebhook(request: Request) {
  return constantTimeEquals(extractBearerToken(request), process.env.PLENA_WEBHOOK_TOKEN ?? "");
}

export function normalizePlenaLeadPayload(payload: unknown) {
  const data = payload as PlenaLeadPayload | null;
  const lead = typeof data?.lead === "object" && data.lead !== null ? data.lead : {};
  const source = limitText(data?.source, 140) || "Plena - chat IA";
  const page = limitText(data?.page, 500);
  const doubt = limitText((lead as { doubt?: unknown; question?: unknown }).doubt, 1000);
  const question = limitText((lead as { question?: unknown }).question, 1000);
  const transcript = normalizeTranscript(data?.transcript);
  const course = limitText((lead as { course?: unknown }).course, 140);
  const createdAt = limitText(data?.created_at, 80);

  return {
    source,
    page,
    fullName: limitText((lead as { name?: unknown }).name, 120),
    phone: limitText((lead as { phone?: unknown }).phone, 80),
    email: limitText((lead as { email?: unknown }).email, 140),
    course,
    doubt: doubt || question,
    transcript,
    createdAt: Number.isNaN(Date.parse(createdAt)) ? null : createdAt,
  };
}

function buildObservations(payload: ReturnType<typeof normalizePlenaLeadPayload>) {
  const lines = [
    `Fonte: ${payload.source}`,
    payload.page ? `Pagina: ${payload.page}` : "",
    payload.course ? `Curso informado: ${payload.course}` : "",
    payload.doubt ? `Duvida/objetivo: ${payload.doubt}` : "",
  ].filter(Boolean);

  if (payload.transcript.length) {
    lines.push(
      "Transcricao recente:",
      ...payload.transcript.map(
        (message) => `${message.role === "assistant" ? "Plena" : "Aluno"}: ${message.content}`,
      ),
    );
  }

  return lines.join("\n").slice(0, 5000);
}

export async function receivePlenaLeadWebhook(payload: unknown): Promise<PlenaLeadResult> {
  const normalized = normalizePlenaLeadPayload(payload);

  if (!normalized.fullName || !normalized.phone) {
    return { ok: false, status: 422, error: "Nome e telefone sao obrigatorios." };
  }

  const unitId = process.env.PLENA_DEFAULT_UNIT_ID?.trim() ?? "";

  if (!isUuid(unitId)) {
    return { ok: false, status: 500, error: "PLENA_DEFAULT_UNIT_ID is not configured." };
  }

  const result = await queryDb<InsertedLeadRow>(
    `
      insert into app_leads (
        unit_id,
        full_name,
        phone,
        email,
        course_name_snapshot,
        acquisition_channel_name_snapshot,
        observations,
        created_by,
        created_at,
        external_source,
        external_page_url,
        external_payload
      )
      values (
        $1,
        $2,
        $3,
        nullif($4, ''),
        nullif($5, ''),
        $6,
        nullif($7, ''),
        null,
        coalesce($8::timestamptz, now()),
        $9,
        nullif($10, ''),
        $11::jsonb
      )
      returning id
    `,
    [
      unitId,
      normalized.fullName,
      normalized.phone,
      normalized.email,
      normalized.course,
      "Plena IA",
      buildObservations(normalized),
      normalized.createdAt,
      normalized.source,
      normalized.page,
      JSON.stringify({
        source: normalized.source,
        page: normalized.page,
        lead: {
          name: normalized.fullName,
          phone: normalized.phone,
          email: normalized.email,
          course: normalized.course,
          doubt: normalized.doubt,
        },
        transcript: normalized.transcript,
        created_at: normalized.createdAt,
      }),
    ],
  );

  return { ok: true, leadId: result.rows[0].id };
}
