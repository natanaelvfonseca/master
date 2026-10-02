alter table app_financial_sync_runs
  add column if not exists mode text not null default 'full',
  add column if not exists class_limit integer;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'app_financial_sync_runs_mode_check') then
    alter table app_financial_sync_runs
      add constraint app_financial_sync_runs_mode_check check (mode in ('full', 'pilot'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'app_financial_sync_runs_class_limit_check') then
    alter table app_financial_sync_runs
      add constraint app_financial_sync_runs_class_limit_check check (class_limit is null or class_limit between 1 and 10000);
  end if;
end $$;

create table if not exists app_financial_sync_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references app_financial_sync_runs(id) on delete cascade,
  unit_id uuid not null references app_units(id) on delete restrict,
  stage text not null check (stage in ('classes', 'class_students', 'student', 'financial_lookup')),
  external_class_id text,
  external_student_id text,
  external_enrollment_id text,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists app_financial_sync_issues_run_idx
  on app_financial_sync_issues (run_id, created_at);
create index if not exists app_financial_sync_issues_unit_idx
  on app_financial_sync_issues (unit_id, created_at desc);
