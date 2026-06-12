import type { AuthSession, UnitSummary } from "@/lib/auth-types";
import { queryDb } from "@/lib/server/db";

export const DEFAULT_ACQUISITION_CHANNELS = [
  { name: "Meta Ads", type: "Pago" },
  { name: "Google Ads", type: "Pago" },
  { name: "TikTok", type: "Pago" },
  { name: "Instagram Orgânico", type: "Orgânico" },
  { name: "WhatsApp", type: "Conversacional" },
  { name: "Indicação", type: "Relacionamento" },
  { name: "Site", type: "Próprio" },
  { name: "Evento", type: "Presencial" },
  { name: "Parceria", type: "Relacionamento" },
] as const;

let commercialSchemaPromise: Promise<void> | null = null;

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getUnitFromRequest(session: AuthSession, request: Request): UnitSummary | null {
  const url = new URL(request.url);
  const requestedUnitId = url.searchParams.get("unitId")?.trim();
  const unitId = requestedUnitId || session.activeUnit?.id || "";

  return session.units.find((unit) => unit.id === unitId) ?? null;
}

export function getUnitFromBody(session: AuthSession, unitId: unknown): UnitSummary | null {
  const requestedUnitId = typeof unitId === "string" ? unitId.trim() : "";
  const selectedUnitId = requestedUnitId || session.activeUnit?.id || "";

  return session.units.find((unit) => unit.id === selectedUnitId) ?? null;
}

export function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function ensureCommercialSchema() {
  commercialSchemaPromise ??= queryDb(`
    create table if not exists app_courses (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      name text not null,
      value numeric(12,2) not null default 0 check (value >= 0),
      category text,
      status text not null default 'active' check (status in ('active', 'inactive')),
      created_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create unique index if not exists app_courses_unit_name_lower_idx on app_courses (unit_id, lower(name));
    create index if not exists app_courses_unit_status_idx on app_courses (unit_id, status);

    create table if not exists app_acquisition_channels (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      name text not null,
      type text not null,
      status text not null default 'active' check (status in ('active', 'inactive')),
      created_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create unique index if not exists app_acquisition_channels_unit_name_lower_idx on app_acquisition_channels (unit_id, lower(name));
    create index if not exists app_acquisition_channels_unit_status_idx on app_acquisition_channels (unit_id, status);

    create table if not exists app_leads (
      id uuid primary key default gen_random_uuid(),
      unit_id uuid not null references app_units(id) on delete cascade,
      full_name text not null,
      phone text not null,
      email text,
      course_id uuid references app_courses(id) on delete set null,
      course_name_snapshot text,
      course_value_snapshot numeric(12,2),
      acquisition_channel_id uuid references app_acquisition_channels(id) on delete set null,
      acquisition_channel_name_snapshot text,
      observations text,
      stage text not null default 'Novo lead' check (
        stage in (
          'Novo lead',
          'Em contato',
          'Qualificado',
          'Proposta',
          'Pagamento pendente',
          'Confirmado',
          'Recuperação',
          'Matriculado'
        )
      ),
      created_by uuid references app_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists app_leads_unit_stage_idx on app_leads (unit_id, stage);
    create index if not exists app_leads_unit_user_stage_idx on app_leads (unit_id, created_by, stage);
    create index if not exists app_leads_unit_created_idx on app_leads (unit_id, created_at desc);
    create index if not exists app_leads_course_idx on app_leads (course_id);
    create index if not exists app_leads_acquisition_channel_idx on app_leads (acquisition_channel_id);
  `).then(() => undefined);

  return commercialSchemaPromise;
}

export async function ensureDefaultAcquisitionChannels(unitId: string) {
  await ensureCommercialSchema();

  await queryDb(
    `
      insert into app_acquisition_channels (unit_id, name, type, status)
      select $1, item.name, item.type, 'active'
      from jsonb_to_recordset($2::jsonb) as item(name text, type text)
      on conflict do nothing
    `,
    [unitId, JSON.stringify(DEFAULT_ACQUISITION_CHANNELS)],
  );
}
