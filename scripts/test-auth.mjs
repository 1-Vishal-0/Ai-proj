import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Browser regression against a deterministic Auth/Data API fixture. PostgreSQL policy tests run separately.
const api = 'https://attendance-auth-test.example';
const email = 'student@attendance.example';
const password = 'Fictional-Test-Password-Only!';
process.env.VITE_PORTAL_MODE = 'production';
process.env.VITE_SUPABASE_URL = api;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
const authUser = {
  id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email,
  app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
};
const profile = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Student', email, role: 'student' };
const payload = Buffer.from(JSON.stringify({
  sub: authUser.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600,
})).toString('base64url');
const token = { access_token: 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.fixture', refresh_token: 'fixture-refresh-token',
  expires_in: 3600, token_type: 'bearer', user: authUser };
const settings = {
  id: '00000000-0000-4000-8000-000000000003', institution_name: 'Fictional Institute', short_name: 'Fixture Portal',
  academic_term: 'Semester 1', threshold_percentage: 75, warning_threshold: 80,
};
const server = await createServer({ cacheDir: 'node_modules/.vite/auth-test', server: { host: '127.0.0.1', port: 4192, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  let passwordRequests = 0;
  let recoverRequests = 0;
  let verifyRequests = 0;
  let passwordChanged = false;
  const lecture = {id:'00000000-0000-4000-8000-000000000091',slot_id:'fixture-slot',day:'2026-11-25',starts:'09:00',phase:'open',version:1,present_count:0,expires_at:new Date(Date.now()+300000).toISOString()};
  const qrToken='00000000-0000-4000-8000-000000000092';
  const classroom = {id:'00000000-0000-4000-8000-000000000093',class_id:lecture.id,subject_id:qrToken,subject:'Introduction to Computing',code:'CS101',semester:1,section:'A',academic_year:'2026-2027'};
  let classroomJoined = false;
  const calendarDay = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const origin = server.resolvedUrls.local[0];
  const expectRoute = (path) => page.waitForURL(new URL(path, origin).href);
  await page.route(api + '/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isJson = (body, status = 200) => route.fulfill({ status, json: body });
    switch (url.pathname) {
      case '/auth/v1/token': {
        ++passwordRequests;
        return request.postDataJSON().password === password
          ? isJson(token)
          : isJson({ msg: 'Invalid login credentials', code: 'invalid_credentials' }, 400);
      }
      case '/auth/v1/logout':
        return route.fulfill({ status: 204 });
      case '/auth/v1/recover':
        ++recoverRequests;
        assert.equal(request.postDataJSON().email, email);
        return isJson({});
      case '/auth/v1/verify':
        ++verifyRequests;
        assert.equal(request.postDataJSON().type, 'recovery');
        assert.equal(request.postDataJSON().token_hash, 'fixture-only');
        return isJson(token);
      case '/auth/v1/user':
        if (request.method() === 'PUT') {
          assert.equal(request.postDataJSON().password, password);
          passwordChanged = true;
        }
        return isJson({ user: authUser });
      case '/rest/v1/rpc/portal_profile_id':
        assert.equal(request.headers().authorization, 'Bearer ' + token.access_token);
        return isJson(profile.id);
      case '/rest/v1/user_profiles':
        return isJson(url.searchParams.has('id') ? [] : [profile]);
      case '/rest/v1/institution_settings':
        return isJson(url.searchParams.has('id') ? [] : [settings]);
      case '/rest/v1/departments':
        return isJson(url.searchParams.has('id') ? [] : [{id:'00000000-0000-4000-8000-000000000010',name:'Computing',code:'CS'}]);
      case '/rest/v1/lecture_roll_calls':
        return isJson([lecture]);
      case '/rest/v1/rpc/lecture_review':
        return isJson({session:lecture,pin:'00123456',token:qrToken,roster:[],signature:'fixture'});
      case '/rest/v1/rpc/lecture_checkin':
        return isJson(request.postDataJSON().credential === qrToken ? 'Checked in successfully.' : 'Invalid or expired check-in.');
      case '/rest/v1/rpc/classroom_list':
        return isJson([{...classroom,joined:profile.role==='teacher'||classroomJoined}]);
      case '/rest/v1/rpc/classroom_join':
        assert.equal(request.postDataJSON().room,classroom.id);
        classroomJoined=true;
        return isJson(null);
      case '/rest/v1/classroom_posts':
        return isJson([{id:classroom.id,kind:'note',title:'Week one lecture notes',body:'Introduction to algorithms'}]);
      case '/rest/v1/rpc/schedule_agenda':
        return isJson([{entry_id:lecture.id,day:calendarDay,title:'Computing Lab',code:'CS101',section:'Computing 1A',teacher:'Fixture Instructor',place:'Lab A',starts:'09:00',ends:'10:00',kind:'lab',state:'rescheduled',own:profile.role==='teacher',utc_start:calendarDay+'T03:30:00Z',utc_end:calendarDay+'T04:30:00Z'}]);
      case '/rest/v1/rpc/schedule_attendance':
        assert.equal(request.postDataJSON().source_slot,lecture.id);
        return isJson(lecture.id);
      default:
        assert.ok(url.pathname.startsWith('/rest/v1/'), 'Unexpected request ' + url.pathname);
        return isJson([]);
    }
  });

  await page.goto(origin);
  await expectRoute('/login');
  assert.equal(await page.getByText('Demo administrator', { exact: true }).count(), 0);
  assert.equal(passwordRequests, 0);
  await page.getByLabel('Institutional email').fill(email);
  await page.getByLabel(/^Password/).fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Sign-in failed' }).waitFor();
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectRoute('/student/overview');
  await page.reload();
  await page.getByRole('button', { name: 'Account menu' }).waitFor();
  await expectRoute('/student/overview');
  assert.equal(passwordRequests, 2, 'Reload must restore the Supabase session');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter((key) => /auth-token|attendance_auth|academic_portal/i.test(key))), []);

  await page.goto(new URL('/admin/overview', origin).href);
  await expectRoute('/unauthorized');
  await page.goto(origin);
  await expectRoute('/student/overview');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click();
  await expectRoute('/login');
  await page.reload();
  await page.getByRole('heading', { name: 'Sign in to Academic Portal' }).waitFor();

  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Institutional email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByRole('status').filter({ hasText: 'If this email has an account' }).waitFor();
  assert.equal(recoverRequests, 1);
  await page.goto(new URL('/auth/reset?token_hash=fixture-only&type=recovery', origin).href);
  await expectRoute('/auth/reset');
  await page.getByLabel('New password').waitFor();
  await page.reload();
  await page.getByLabel('New password').fill(password);
  await page.getByRole('button', { name: 'Save password' }).click();
  await expectRoute('/login');
  assert.equal(verifyRequests, 1);
  assert.ok(passwordChanged);
  console.log('Browser authentication, session restoration, route guards, logout and password reset passed.');
  profile.role = 'admin';
  await page.getByLabel('Institutional email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expectRoute('/admin/overview');
  const verifyOverview = async () => {
    await page.getByRole('heading', {name:'Institution overview',level:1}).waitFor();
    await page.locator('main .recharts-wrapper').nth(1).waitFor();
    assert.equal(await page.getByText('Something went wrong', {exact:true}).count(), 0);
  };
  await verifyOverview();
  await page.reload();
  await verifyOverview();
  const nav = page.getByRole('complementary', {name:'Primary navigation'});
  for (const group of ['Workspace','Academic Management','People','Attendance','Administration']) {
    await nav.getByRole('heading',{name:group,exact:true}).waitFor();
  }
  for (const [path,heading] of [['catalog','Academic hierarchy'],['workload','Faculty workload'],
    ['shortages','Attendance shortages'],['submissions','Pending attendance'],['policy','Branding & permissions'],['register','Enrollment & import']]) {
    await nav.locator('a[href="/admin/'+path+'"]').click();
    await page.getByRole('heading',{name:heading,exact:true,level:1}).waitFor();
  }
  await page.getByLabel('Directory',{exact:true}).selectOption('teacher');
  await page.getByLabel('Entry method').selectOption('csv');
  const csv = page.getByLabel(/CSV content/);
  await csv.fill('name,email,identifier\n"Lee, Alex",alex@attendance.example,F01');
  await page.getByRole('cell',{name:'Ready'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Register 1 person',exact:true}).isEnabled());
  await csv.fill('name,email,identifier\nAlex,alex@attendance.example,F01\nLee,ALEX@attendance.example,f01');
  await page.getByRole('cell',{name:'Duplicate email, Duplicate identifier'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Register 2 people'}).isDisabled());
  console.log('Administrator navigation, scoped workspace pages and CSV preview passed.');
  await page.goto(new URL('/admin/timetable',origin).href);
  await page.getByRole('button',{name:'Versions',exact:true}).click();
  await page.getByRole('heading',{name:'Timetable versions'}).waitFor();
  profile.role='teacher';
  await page.goto(new URL('/teacher/classrooms/'+classroom.id,origin).href);
  await page.getByRole('button',{name:'People',exact:true}).click();
  await page.getByLabel('Student college email').waitFor();
  await page.getByRole('navigation',{name:'Classroom sections'}).getByRole('button',{name:'Attendance',exact:true}).click();
  assert.match(await page.getByRole('link',{name:'Take attendance for this classroom'}).getAttribute('href'),/class=.*&subject=/);
  await page.goto(new URL('/teacher/timetable',origin).href);
  await page.getByRole('button',{name:/Computing Lab/}).click();
  await page.getByRole('button',{name:'Open attendance',exact:true}).click();
  await page.waitForURL(new URL('/teacher/mark?session='+lecture.id,origin).href);
  await page.goto(new URL('/teacher/mark?session='+lecture.id,origin).href);
  await page.getByText('00123456',{exact:true}).waitFor();
  await page.getByRole('img',{name:'Scan to check in to this lecture'}).waitFor();
  await page.getByRole('button',{name:'Account menu'}).click();
  await page.getByRole('banner').getByRole('button',{name:'Sign out'}).click();
  await expectRoute('/login');
  profile.role='student';
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('/student/check-in#'+qrToken,origin).href);
  await page.getByLabel('Institutional email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'Check in',exact:true}).click();
  await page.getByText('Checked in successfully.').waitFor();
  await page.getByRole('button',{name:'Enter a numeric code instead'}).click();
  await page.getByLabel('Eight-digit code').fill('01234567');
  await page.getByRole('button',{name:'Check in',exact:true}).click();
  await page.getByText('Invalid or expired check-in.').waitFor();
  await page.goto(new URL('/student/classrooms',origin).href);
  await page.getByRole('link',{name:'Review invitation'}).click();
  await page.getByRole('button',{name:'Join classroom'}).click();
  await page.getByRole('button',{name:'Notes',exact:true}).click();
  await page.getByText('Week one lecture notes').waitFor();
  assert.equal(await page.getByRole('button',{name:'People',exact:true}).count(),0);
  await page.goto(new URL('/student/timetable',origin).href);
  await page.getByRole('button',{name:/^month$/i}).click();
  await page.getByRole('button',{name:/Computing Lab.*Rescheduled/}).waitFor();
  await page.getByRole('button',{name:/^day$/i}).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export calendar (.ics)'}).click();
  assert.equal((await download).suggestedFilename(),'academic-timetable.ics');
  console.log('Faculty QR display, mobile check-in, classroom navigation, student joining and notes passed.');
} finally {
  await browser?.close();
  await server.close();
}
