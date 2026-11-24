-- Run in the fictional test project after creating and confirming the separate administrator in Authentication > Users.
do $$
declare
  auth_key uuid;
  institution_key uuid;
begin
  select id into strict institution_key from public.institutions where name = 'Fictional Test Institute';
  select id into auth_key from auth.users
    where lower(email) = 'admin@attendance.example' and email_confirmed_at is not null;
  if auth_key is null then
    raise exception 'Create and confirm admin@attendance.example in this project first.';
  end if;
  if exists(select 1 from public.user_profiles where auth_id=auth_key and role='admin'
    and enabled and institution_id=institution_key and department_id is null) then return; end if;
  perform public.portal_provision_account(auth_key,institution_key,null,'admin','Fictional Registrar');
end $$;
