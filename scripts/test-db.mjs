import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const directory = new URL('../supabase/migrations/', import.meta.url);
const migrations = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
const sql = async (name, base) => (await readFile(new URL(name, base), 'utf8')).replace(/^\uFEFF/, '');
const db = new PGlite();

try {
  // Only the Supabase Auth interface needed by PostgreSQL is stubbed here. RLS and SQL are real.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key default gen_random_uuid(), email text unique);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `);
  const setup = await sql('../supabase/fresh-project-setup.sql', import.meta.url);
  const workspaceMigration = await sql('20261125000600_admin_workspace.sql',directory);
  assert.ok(setup.includes(workspaceMigration.trim()), 'SQL Editor setup must include the workspace migration');
<<<<<<< HEAD
  const liveMigration = await sql('20261125000700_live_attendance.sql',directory);
  assert.ok(setup.includes(liveMigration.trim()), 'SQL Editor setup must include the live session migration');
  assert.ok(setup.includes((await sql('20261125000800_classrooms.sql',directory)).trim()));
  assert.ok(setup.includes((await sql('20261125000900_academic_schedule.sql',directory)).trim()));
  for (const file of migrations) {
    await db.exec('begin; ' + await sql(file, directory) + '; commit;');
  }
  const fixture = await sql('../supabase/tests/authorization.sql', import.meta.url);
  const liveTests = await sql('../supabase/tests/live_attendance.sql', import.meta.url);
  const classroomTests = await sql('../supabase/tests/classrooms.sql', import.meta.url);
  const scheduleTests = await sql('../supabase/tests/academic_schedule.sql', import.meta.url);
  await db.exec(fixture.replace(/rollback;\s*$/i, () => liveTests + '\n' + classroomTests + '\n' + scheduleTests + '\nreset role; rollback;'));
=======
  for (const file of migrations) {
    await db.exec('begin; ' + await sql(file, directory) + '; commit;');
  }
  await db.exec(await sql('../supabase/tests/authorization.sql', import.meta.url));
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
  console.log('PostgreSQL migrations, authorization, duplicate prevention and transactional workflows passed.');
  await db.exec("alter table auth.users add column email_confirmed_at timestamptz; insert into public.institutions(name) values('Fictional Test Institute'); insert into auth.users(email,email_confirmed_at) values('admin@attendance.example',now())");
  const linkAdmin = await sql('../supabase/link-test-admin.sql',import.meta.url);
  await db.exec(linkAdmin);
  await db.exec(linkAdmin);
  assert.equal((await db.query("select count(*)::int as n from public.user_profiles where email='admin@attendance.example' and role='admin' and auth_linked")).rows[0].n,1);
  console.log('Fictional administrator setup and repeat linking passed.');

  const legacy = new PGlite();
  try {
    await legacy.exec('create role anon; create role authenticated; create role service_role; create schema auth;');
    await legacy.exec(`
      create table auth.users(id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    await legacy.exec(await sql('../supabase/schema.sql', import.meta.url));
    await legacy.exec(`
      insert into departments(id,name,code) values ('77770000-0000-4000-8000-000000000001','Legacy Computing','LEG');
      insert into user_profiles(id,auth_id,name,email,role) values
        ('77770000-0000-4000-8000-000000000002','77770000-0000-4000-8000-000000000003','Legacy Admin','legacy@attendance.example','admin');
    `);
    for (const file of migrations) {
      await legacy.exec('begin; ' + await sql(file, directory) + '; commit;');
    }
    const { rows } = await legacy.query("select id from departments where code = 'LEG'");
    assert.equal(rows[0].id, '77770000-0000-4000-8000-000000000001');
    await legacy.exec("set role authenticated; select set_config('request.jwt.claim.sub','77770000-0000-4000-8000-000000000003',false)");
    assert.equal((await legacy.query('select public.portal_profile_id() as id')).rows[0].id, null);
    assert.equal((await legacy.query("select id from departments where code = 'LEG'")).rows.length, 0);
    console.log('Legacy IDs preserved and unlinked legacy accounts cannot access the portal.');
  } finally {
    await legacy.close();
  }
} finally {
  await db.close();
}
