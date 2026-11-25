import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

// Creates a disposable database on a local PostgreSQL server. No Supabase account is used.
const url = new URL(
  process.env.ATTENDANCE_TEST_POSTGRES_URL ||
    'postgresql://postgres@127.0.0.1:55462/postgres',
);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
const scratch = 'attendance_test_' + randomUUID().replaceAll('-', '');
const manager = new pg.Client({ connectionString: url.href });
await manager.connect();
const clients = [];
const file = async (name) =>
  (await readFile(new URL('../' + name, import.meta.url), 'utf8')).replace(
    /^\uFEFF/,
    '',
  );
async function connection() {
  const c = new pg.Client({ connectionString: url.href });
  await c.connect();
  clients.push(c);
  return c;
}
let created = false;
try {
  await manager.query('create database ' + scratch);
  created = true;
  url.pathname = '/' + scratch;
  const setup = await connection();
  // Supabase request roles are cluster-wide. Use a dedicated local test cluster.
  for (const role of ['anon', 'authenticated', 'service_role']) {
    if (
      !(await manager.query('select 1 from pg_roles where rolname=$1', [role]))
        .rowCount
    )
      await manager.query('create role ' + role);
  }
  await setup.query(
    "create schema auth; create table auth.users(id uuid primary key,email text unique); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;create publication supabase_realtime;",
  );
  for (const name of (
    await readdir(new URL('../supabase/migrations/', import.meta.url))
  )
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    await setup.query(await file('supabase/migrations/' + name));
  }
  const fixture = await file('supabase/tests/authorization.sql');
  await setup.query(
    fixture.slice(0, fixture.indexOf('set local role anon;')) + 'commit;',
  );
  const liveFixture = await file('supabase/tests/live_attendance.sql');
  await setup.query(
    'begin; set local search_path=attendance_test,public;' +
      liveFixture.slice(
        0,
        liveFixture.indexOf(
          "select set_config('request.jwt.claim.sub',id(107)",
        ),
      ) +
      'commit;',
  );
  const { id, pin } = (
    await setup.query(
      'select call_id as id,pin from attendance_private.lecture_keys',
    )
  ).rows[0];
  const one = await connection(),
    two = await connection();
  async function as(c, n) {
    await c.query('set role authenticated');
    await c.query(
      "select set_config('request.jwt.claim.sub',attendance_test.id($1)::text,false)",
      [n],
    );
  }
  async function race(query, args) {
    await one.query('begin');
    const first = await one.query(query, args);
    const blocked = two.query(query, args).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    try {
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const r = await setup.query(
          "select wait_event_type='Lock' as waiting from pg_stat_activity where pid=$1",
          [two.processID],
        );
        if (r.rows[0]?.waiting) {
          waiting = true;
          break;
        }
        await delay(20);
      }
      assert.ok(waiting, 'Second submission waits on the first transaction');
    } finally {
      await one.query('commit');
    }
    return [first, await blocked];
  }
  await as(one, 103);
  await as(two, 103);
  const [first, second] = await race('select lecture_checkin($1) as result', [
    pin,
  ]);
  assert.match(first.rows[0].result, /successfully/);
  assert.match(second.value.rows[0].result, /already recorded/);
  await as(one, 102);
  await as(two, 102);
  await one.query("select lecture_transition($1,'close')", [id]);
  const review = (await one.query('select lecture_review($1) as r', [id]))
    .rows[0].r;
  assert.equal(review.session.present_count, 1);
  await as(two,100);
  await two.query("select lecture_policy('require_mark')");
  const finalize = "select lecture_transition($1,'finalize',null,$2,$3)";
  await assert.rejects(one.query(finalize,[id,review.session.version,review.signature]),/Review the roster again/);
  const updated = (await one.query('select lecture_review($1) as r',[id])).rows[0].r;
  await assert.rejects(one.query(finalize,[id,updated.session.version,updated.signature]),/Mark every student/);
  await two.query("select lecture_policy('absent')");
  await as(two,102);
  await race("select lecture_transition($1,'finalize',null,$2,$3)", [
    id,
    review.session.version,
    review.signature,
  ]).then(([, other]) =>
    assert.match(other.error.message, /transition unavailable/),
  );
  const records = await setup.query(
    'select status,count(*)::int as n from attendance_records group by status order by status',
  );
  assert.deepEqual(records.rows, [
    { status: 'absent', n: 1 },
    { status: 'present', n: 1 },
  ]);
  console.log(
    'Concurrent check-in and final submission serialized correctly. Unmarked student recorded according to policy.',
  );
} finally {
  await Promise.all(clients.map((c) => c.end()));
  if (created) await manager.query('drop database ' + scratch);
  await manager.end();
}
