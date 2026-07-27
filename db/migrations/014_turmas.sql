alter table app_course_attendances
  add column if not exists class_date date;

update app_course_attendances
set class_date = date '2026-10-20'
where class_date is null;

alter table app_course_attendances
  alter column class_date set default date '2026-10-20',
  alter column class_date set not null;

do $$
declare
  legacy_constraint text;
begin
  select conname
  into legacy_constraint
  from pg_constraint
  where conrelid = 'app_course_attendances'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) =
      'UNIQUE (unit_id, course_id, city_normalized, state)'
  limit 1;

  if legacy_constraint is not null then
    execute format(
      'alter table app_course_attendances drop constraint %I',
      legacy_constraint
    );
  end if;
end
$$;

create unique index if not exists app_course_attendances_identity_idx
  on app_course_attendances (unit_id, course_id, city_normalized, state, class_date);

create unique index if not exists app_course_attendances_active_route_idx
  on app_course_attendances (unit_id, course_id, city_normalized, state)
  where status = 'active';

create index if not exists app_course_attendances_date_idx
  on app_course_attendances (unit_id, status, class_date);

alter table app_leads
  add column if not exists turma_id uuid references app_course_attendances(id) on delete set null;

create index if not exists app_leads_turma_idx
  on app_leads (unit_id, turma_id);

update app_leads lead
set turma_id = event.attendance_id
from app_meta_lead_events event
where event.lead_id = lead.id
  and event.attendance_id is not null
  and lead.turma_id is null;

update app_leads lead
set turma_id = turma.id
from app_course_attendances turma
where lead.turma_id is null
  and lead.unit_id = turma.unit_id
  and lead.course_id = turma.course_id
  and regexp_replace(
    translate(lower(coalesce(lead.city, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9]+', ' ', 'g'
  ) in (
    turma.city_normalized,
    turma.city_normalized || ' ' || lower(turma.state)
  )
  and turma.status = 'active';

update app_leads lead
set city = turma.city || ' - ' || turma.state
from app_course_attendances turma
where lead.turma_id = turma.id
  and lead.city is distinct from turma.city || ' - ' || turma.state;
