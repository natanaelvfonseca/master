import type { QueryResultRow } from "pg";
import {
  buildDefaultBrandPlenSettings,
  MAX_BRAND_PLEN_REFERENCES_PER_TYPE,
  type BrandPlenReferenceImage,
  type BrandPlenReferenceMap,
  type BrandPlenSettings,
} from "@/lib/brand-plen-settings";
import type { BrandImageQuality } from "@/lib/generateBrandImage";
import { queryDb } from "@/lib/server/db";

type BrandPlenSettingsRow = QueryResultRow & {
  unit_id: string;
  style_prompt: string | null;
  tone_prompt: string | null;
  required_rules: Array<string> | null;
  forbidden_rules: Array<string> | null;
  default_quality: BrandImageQuality | null;
  logo_data_url: string | null;
  references_by_piece_type: unknown;
  updated_at: string | null;
  updated_by_name: string | null;
};

export type BrandPlenSettingsInput = {
  stylePrompt: string;
  tonePrompt: string;
  requiredRules: Array<string>;
  forbiddenRules: Array<string>;
  defaultQuality: BrandImageQuality;
  logoDataUrl: string | null;
  referencesByPieceType: BrandPlenReferenceMap;
};

const MAX_PROMPT_TEXT_LENGTH = 3200;
const MAX_RULES = 14;
const MAX_RULE_LENGTH = 280;
const MAX_REFERENCE_DATA_URL_LENGTH = 8 * 1024 * 1024;

let brandPlenSettingsSchemaPromise: Promise<void> | null = null;

export function ensureBrandPlenSettingsSchema() {
  brandPlenSettingsSchemaPromise ??= queryDb(`
    create table if not exists app_brand_plen_settings (
      unit_id uuid primary key references app_units(id) on delete cascade,
      style_prompt text not null,
      tone_prompt text not null,
      required_rules text[] not null,
      forbidden_rules text[] not null,
      default_quality text not null default 'high' check (default_quality in ('low', 'medium', 'high')),
      logo_data_url text,
      references_by_piece_type jsonb not null default '{}'::jsonb,
      updated_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table app_brand_plen_settings add column if not exists style_prompt text;
    alter table app_brand_plen_settings add column if not exists tone_prompt text;
    alter table app_brand_plen_settings add column if not exists required_rules text[];
    alter table app_brand_plen_settings add column if not exists forbidden_rules text[];
    alter table app_brand_plen_settings add column if not exists default_quality text not null default 'high';
    alter table app_brand_plen_settings add column if not exists logo_data_url text;
    alter table app_brand_plen_settings add column if not exists references_by_piece_type jsonb not null default '{}'::jsonb;
    alter table app_brand_plen_settings add column if not exists updated_by uuid references app_users(id) on delete set null;
    alter table app_brand_plen_settings add column if not exists created_at timestamptz not null default now();
    alter table app_brand_plen_settings add column if not exists updated_at timestamptz not null default now();
  `)
    .then(() => undefined)
    .catch((error) => {
      brandPlenSettingsSchemaPromise = null;
      throw error;
    });

  return brandPlenSettingsSchemaPromise;
}

function isQuality(value: unknown): value is BrandImageQuality {
  return value === "low" || value === "medium" || value === "high";
}

function isDataImageUrl(value: unknown) {
  return (
    typeof value === "string" &&
    value.length <= MAX_REFERENCE_DATA_URL_LENGTH &&
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)
  );
}

function sanitizeText(value: unknown, fallback: string, maxLength = MAX_PROMPT_TEXT_LENGTH) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";

  return text || fallback;
}

function sanitizeRules(value: unknown, fallback: Array<string>) {
  const rules = Array.isArray(value) ? value : [];
  const sanitized = rules
    .map((rule) => (typeof rule === "string" ? rule.trim().slice(0, MAX_RULE_LENGTH) : ""))
    .filter(Boolean)
    .slice(0, MAX_RULES);

  return sanitized.length ? sanitized : fallback;
}

function sanitizeReferenceMap(value: unknown): BrandPlenReferenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: BrandPlenReferenceMap = {};

  Object.entries(value as Record<string, unknown>).forEach(([pieceType, images]) => {
    if (!pieceType || !Array.isArray(images)) {
      return;
    }

    const validImages = images
      .map((image) => {
        const data = image as Partial<BrandPlenReferenceImage>;
        const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : "";
        const mimeType = typeof data.mimeType === "string" ? data.mimeType.trim().slice(0, 60) : "";
        const dataUrl = data.dataUrl;

        if (!name || !mimeType.startsWith("image/") || !isDataImageUrl(dataUrl)) {
          return null;
        }

        return {
          id:
            typeof data.id === "string" && data.id.trim()
              ? data.id.trim().slice(0, 80)
              : crypto.randomUUID(),
          name,
          mimeType,
          dataUrl,
          createdAt:
            typeof data.createdAt === "string" && data.createdAt.trim()
              ? data.createdAt.trim()
              : new Date().toISOString(),
        };
      })
      .filter(Boolean)
      .slice(0, MAX_BRAND_PLEN_REFERENCES_PER_TYPE) as Array<BrandPlenReferenceImage>;

    if (validImages.length) {
      output[pieceType.slice(0, 80)] = validImages;
    }
  });

  return output;
}

function mapSettings(row: BrandPlenSettingsRow | undefined, unitId: string): BrandPlenSettings {
  const defaults = buildDefaultBrandPlenSettings(unitId);

  if (!row) {
    return defaults;
  }

  return {
    unitId: row.unit_id,
    stylePrompt: sanitizeText(row.style_prompt, defaults.stylePrompt),
    tonePrompt: sanitizeText(row.tone_prompt, defaults.tonePrompt),
    requiredRules: sanitizeRules(row.required_rules, defaults.requiredRules),
    forbiddenRules: sanitizeRules(row.forbidden_rules, defaults.forbiddenRules),
    defaultQuality: isQuality(row.default_quality) ? row.default_quality : defaults.defaultQuality,
    logoDataUrl: isDataImageUrl(row.logo_data_url) ? row.logo_data_url : null,
    referencesByPieceType: sanitizeReferenceMap(row.references_by_piece_type),
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
  };
}

export function sanitizeBrandPlenSettingsInput(
  value: unknown,
  unitId: string,
): BrandPlenSettingsInput {
  const data = value as Partial<BrandPlenSettingsInput>;
  const defaults = buildDefaultBrandPlenSettings(unitId);

  return {
    stylePrompt: sanitizeText(data?.stylePrompt, defaults.stylePrompt),
    tonePrompt: sanitizeText(data?.tonePrompt, defaults.tonePrompt),
    requiredRules: sanitizeRules(data?.requiredRules, defaults.requiredRules),
    forbiddenRules: sanitizeRules(data?.forbiddenRules, defaults.forbiddenRules),
    defaultQuality: isQuality(data?.defaultQuality) ? data.defaultQuality : defaults.defaultQuality,
    logoDataUrl: isDataImageUrl(data?.logoDataUrl) ? data.logoDataUrl : null,
    referencesByPieceType: sanitizeReferenceMap(data?.referencesByPieceType),
  };
}

export async function getBrandPlenSettings(unitId: string) {
  await ensureBrandPlenSettingsSchema();

  const result = await queryDb<BrandPlenSettingsRow>(
    `
      select
        s.unit_id,
        s.style_prompt,
        s.tone_prompt,
        s.required_rules,
        s.forbidden_rules,
        s.default_quality,
        s.logo_data_url,
        s.references_by_piece_type,
        s.updated_at::text,
        u.name as updated_by_name
      from app_brand_plen_settings s
      left join app_users u on u.id = s.updated_by
      where s.unit_id = $1
      limit 1
    `,
    [unitId],
  );

  return mapSettings(result.rows[0], unitId);
}

export async function saveBrandPlenSettings(
  unitId: string,
  userId: string,
  input: BrandPlenSettingsInput,
) {
  await ensureBrandPlenSettingsSchema();

  const result = await queryDb<BrandPlenSettingsRow>(
    `
      insert into app_brand_plen_settings (
        unit_id,
        style_prompt,
        tone_prompt,
        required_rules,
        forbidden_rules,
        default_quality,
        logo_data_url,
        references_by_piece_type,
        updated_by
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
      on conflict (unit_id) do update set
        style_prompt = excluded.style_prompt,
        tone_prompt = excluded.tone_prompt,
        required_rules = excluded.required_rules,
        forbidden_rules = excluded.forbidden_rules,
        default_quality = excluded.default_quality,
        logo_data_url = excluded.logo_data_url,
        references_by_piece_type = excluded.references_by_piece_type,
        updated_by = excluded.updated_by,
        updated_at = now()
      returning
        unit_id,
        style_prompt,
        tone_prompt,
        required_rules,
        forbidden_rules,
        default_quality,
        logo_data_url,
        references_by_piece_type,
        updated_at::text,
        $10::text as updated_by_name
    `,
    [
      unitId,
      input.stylePrompt,
      input.tonePrompt,
      input.requiredRules,
      input.forbiddenRules,
      input.defaultQuality,
      input.logoDataUrl,
      JSON.stringify(input.referencesByPieceType),
      userId,
      null,
    ],
  );

  return mapSettings(result.rows[0], unitId);
}
