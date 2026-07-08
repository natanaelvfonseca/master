alter table app_users drop constraint if exists app_users_role_check;

alter table app_users
  add constraint app_users_role_check
  check (role in ('MASTER', 'CEO', 'CVO', 'DIRETOR', 'GERENTE', 'MARKETING', 'CONSULTOR'));

update app_users
set role = 'CVO',
    updated_at = now()
where lower(email) = lower('jrcunha@escolamaster.com')
  and role = 'CEO';
