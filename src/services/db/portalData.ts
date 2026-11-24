import type { DatabaseState, AcademicYear, Semester, Holiday } from './database';
import { db } from './database';
import { requireSupabase } from '../supabaseClient';
import type { AcademicClass, InstitutionSettings, Student } from '../../types';

const profileColumns = 'id,name,email,role,avatar_url,phone,created_at,institution_id,department_id,enabled,archived_at,auth_linked';
const sessionColumns = 'id,class_id,subject_id,teacher_id,date,start_time,end_time,session_type,timetable_entry_id,is_code_active,created_at';
const pageSize = 500;

async function readRows<T>(table: string, signal: AbortSignal, columns = '*'): Promise<T[]> {
  const rows: T[] = [];
  const client = requireSupabase();
  let lastId: string | undefined;
  for (;;) {
    let query = client.from(table).select(columns).order('id').limit(pageSize);
    if (lastId) query = query.gt('id', lastId);
    const { data, error } = await query.abortSignal(signal);
    if (error) throw new Error(`Unable to load ${table.replaceAll('_', ' ')}. ${error.message}`);
    const page = data as unknown as (T & { id: string })[];
    rows.push(...page);
    if (page.length === 0) return rows;
    lastId = page[page.length - 1].id;
  }
}

async function readRecentAuditLogs(signal: AbortSignal): Promise<DatabaseState['auditLogs']> {
  const { data, error } = await requireSupabase().from('audit_logs').select()
    .order('timestamp', { ascending: false, nullsFirst: false }).order('id', {ascending:false}).limit(100).abortSignal(signal);
  if (error) throw new Error(`Unable to load audit logs. ${error.message}`);
  return data;
}

type StoredStudent = Omit<Student, 'current_semester' | 'programme_id' | 'vtu_scheme_id' | 'section'>;

async function readSnapshot(signal: AbortSignal): Promise<DatabaseState> {
  const [
    users, departments, programmes, vtuSchemes, classes, subjects, teachers, rawStudents,
    teacherAssignments, enrollments, timetable, timetableChangeLogs, attendanceSessions, attendanceRecords,
    correctionRequests, academicActivities, notifications, auditLogs, settings, years, semesters, holidays,
  ] = await Promise.all([
    readRows<DatabaseState['users'][number]>('user_profiles', signal, profileColumns),
    readRows<DatabaseState['departments'][number]>('departments', signal),
    readRows<DatabaseState['programmes'][number]>('programmes', signal),
    readRows<DatabaseState['vtuSchemes'][number]>('vtu_schemes', signal),
    readRows<AcademicClass>('classes', signal),
    readRows<DatabaseState['subjects'][number]>('subjects', signal),
    readRows<DatabaseState['teachers'][number]>('teachers', signal),
    readRows<StoredStudent>('students', signal),
    readRows<DatabaseState['teacherAssignments'][number]>('teacher_assignments', signal),
    readRows<DatabaseState['enrollments'][number]>('enrollments', signal),
    readRows<DatabaseState['timetable'][number]>('portal_timetable', signal),
    readRows<DatabaseState['timetableChangeLogs'][number]>('timetable_change_logs', signal),
    readRows<DatabaseState['attendanceSessions'][number]>('attendance_sessions', signal, sessionColumns),
    readRows<DatabaseState['attendanceRecords'][number]>('attendance_records', signal),
    readRows<DatabaseState['correctionRequests'][number]>('correction_requests', signal),
    readRows<DatabaseState['academicActivities'][number]>('academic_activities', signal),
    readRows<DatabaseState['notifications'][number]>('notifications', signal),
    readRecentAuditLogs(signal),
    readRows<InstitutionSettings>('institution_settings', signal),
    readRows<AcademicYear>('academic_years', signal),
    readRows<Semester>('semesters', signal),
    readRows<Holiday>('academic_holidays', signal),
  ]);

  if (!settings[0]) throw new Error('Your institution has no portal settings. Contact your administrator.');
  const classById = new Map(classes.map((entry) => [entry.id, entry]));
  const students = rawStudents.map((student) => {
    const academicClass = classById.get(student.class_id);
    return {
      ...student, usn: student.usn || student.roll_number,
      current_semester: academicClass?.semester ?? 0, programme_id: academicClass?.programme_id ?? '',
      vtu_scheme_id: academicClass?.vtu_scheme_id ?? '', section: academicClass?.section ?? '',
    };
  });
  return {
    users, departments, programmes, vtuSchemes, classes, subjects, teachers, students, teacherAssignments,
    enrollments, timetable, timetableChangeLogs, attendanceSessions, attendanceRecords, correctionRequests,
    academicActivities, notifications, auditLogs, years, semesters, holidays, settings: settings[0],
  };
}

let identity: string | null = null;
let pending: { controller: AbortController; promise: Promise<void> } | undefined;
let refreshError: string | null = null;

export function clearPortalData() {
  identity = null;
  refreshError = null;
  pending?.controller.abort();
  pending = undefined;
  db.replaceSnapshot();
}

export function getPortalRefreshError() {
  return refreshError;
}

export function refreshPortalData(profileId = identity, afterWrite = false): Promise<void> {
  if (!profileId) return Promise.resolve();
  if (identity !== profileId) {
    clearPortalData();
    identity = profileId;
  }
  if (pending) {
    if (!afterWrite) return pending.promise;
    return pending.promise.catch(() => undefined).then(() => {
      if (identity === profileId) return refreshPortalData(profileId, true);
    });
  }

  const controller = new AbortController();
  const promise = (async () => {
    try {
      const snapshot = await readSnapshot(controller.signal);
      if (controller.signal.aborted) return;
      if (!snapshot.users.some((user) => user.id === profileId)) {
        throw new Error('Your portal account is unavailable. Contact your administrator.');
      }
      refreshError = null;
      db.replaceSnapshot(snapshot);
    } catch (error) {
      if (controller.signal.aborted) return;
      refreshError = error instanceof Error ? error.message : 'Unable to refresh portal data.';
      db.replaceSnapshot();
      throw error;
    } finally {
      if (!controller.signal.aborted) pending = undefined;
    }
  })();
  pending = { controller, promise };
  return promise;
}

export async function portalRpc<T = void>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function writePortal<T>(write: () => Promise<T>): Promise<T> {
  const active = identity;
  const result = await write();
  if (active && identity === active) {
    // A committed write remains successful if the readback fails. The dashboard shows the refresh error.
    await refreshPortalData(active, true).catch(() => undefined);
  }
  return result;
}

export async function insertPortal<T>(table: string, fields: object): Promise<T> {
  return writePortal(async () => {
    const { data, error } = await requireSupabase().from(table).insert(fields).select().single();
    if (error) throw new Error(error.message);
    return data as T;
  });
}

export function getPortalInstitutionId() {
  const institution = identity && db.getUserById(identity)?.institution_id;
  if (!institution) throw new Error('An institutional account is required.');
  return institution;
}
