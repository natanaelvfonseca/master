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
create index if not exists app_leads_unit_created_idx on app_leads (unit_id, created_at desc);
create index if not exists app_leads_course_idx on app_leads (course_id);
create index if not exists app_leads_acquisition_channel_idx on app_leads (acquisition_channel_id);

insert into app_acquisition_channels (unit_id, name, type, status)
select u.id, c.name, c.type, 'active'
from app_units u
cross join (
  values
    ('Meta Ads', 'Pago'),
    ('Google Ads', 'Pago'),
    ('TikTok', 'Pago'),
    ('Instagram Orgânico', 'Orgânico'),
    ('WhatsApp', 'Conversacional'),
    ('Indicação', 'Relacionamento'),
    ('Site', 'Próprio'),
    ('Evento', 'Presencial'),
    ('Parceria', 'Relacionamento')
) as c(name, type)
on conflict do nothing;
