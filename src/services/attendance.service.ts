import { demoMode } from './supabaseClient';
import { portalRpc, writePortal } from './db/portalData';
import { db } from './db/database';
import type {
  AttendanceRecord,
  AttendanceRosterEntry,
  AttendanceSession,
  AttendanceStatus,
  EnrichedStudent,
  MarkedBy,
  SessionType,
  User,
} from '../types';

export interface SaveSessionAttendanceParams {
  existingSessionId: string | null;
  classId: string;
  subjectId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  students: EnrichedStudent[];
  rosterMap: Record<string, AttendanceRosterEntry>;
  actorUser: User;
}

export const attendanceService = {
  getSessions(filter?: {
    class_id?: string;
    subject_id?: string;
    teacher_id?: string;
    date?: string;
  }): AttendanceSession[] {
    return db.getSessions(filter);
  },

  findSessionForDay(
    classId: string,
    subjectId: string,
    date: string,
    startTime?: string
  ): AttendanceSession | undefined {
    return db
      .getSessions()
      .find((s) => s.class_id === classId && s.subject_id === subjectId && s.date === date && (!startTime || s.start_time.slice(0, 5) === startTime.slice(0, 5)));
  },

  getRecords(sessionId?: string): AttendanceRecord[] {
    return db.getRecords(sessionId);
  },

  getEnrichedSessionRecords(
    sessionId: string
  ): (AttendanceRecord & { student?: EnrichedStudent })[] {
    const students = db.getEnrichedStudents();
    return db.getRecords(sessionId).map((r) => ({
      ...r,
      student: students.find((s) => s.id === r.student_id),
    }));
  },

  getStudentRecord(sessionId: string, studentId: string): AttendanceRecord | undefined {
    return db.getStudentRecord(sessionId, studentId);
  },

  buildInitialRoster(
    students: EnrichedStudent[],
    existingSessionId: string | null
  ): Record<string, AttendanceRosterEntry> {
    const existingRecords = existingSessionId ? db.getRecords(existingSessionId) : [];
    const map: Record<string, AttendanceRosterEntry> = {};

    students.forEach((student) => {
      const found = existingRecords.find((r) => r.student_id === student.id);
      map[student.id] = found
        ? { status: found.status, remarks: found.remarks || '' }
        : { status: 'present', remarks: '' };
    });

    return map;
  },

  async saveSessionAttendance(params: SaveSessionAttendanceParams): Promise<string> {
    if (!demoMode) return writePortal(() => portalRpc<string>('portal_save_attendance', {
      session_key: params.existingSessionId, class_key: params.classId, subject_key: params.subjectId,
      teacher_key: params.teacherId, session_date: params.date, starts: params.startTime, ends: params.endTime,
      kind: params.sessionType,
      roster: params.students.map(({ id }) => ({
        student_id: id, status: params.rosterMap[id]?.status, remarks: params.rosterMap[id]?.remarks,
      })),
    }));
    let sessionId = params.existingSessionId;

    if (!sessionId) {
      const newSession = db.createSession(
        {
          class_id: params.classId,
          subject_id: params.subjectId,
          teacher_id: params.teacherId,
          date: params.date,
          start_time: params.startTime,
          end_time: params.endTime,
          session_type: params.sessionType,
          code: null,
          code_expires_at: null,
          is_code_active: false,
        },
        params.actorUser.id
      );
      sessionId = newSession.id;
    }

    const recordsToSave = params.students.map((s) => ({
      session_id: sessionId!,
      student_id: s.id,
      status: params.rosterMap[s.id]?.status || ('present' as AttendanceStatus),
      marked_by: 'teacher' as MarkedBy,
      remarks: params.rosterMap[s.id]?.remarks || undefined,
    }));

    db.markAttendanceBatch(recordsToSave, params.actorUser);
    return sessionId;
  },

  async correctSingleRecord(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    reason: string,
    actorUser: User
  ): Promise<void> {
    if (!demoMode) return writePortal(() => portalRpc('portal_correct_attendance', {
      session_key: sessionId, student_key: studentId, new_status: status, reason,
    }));
    db.markAttendanceBatch(
      [
        {
          session_id: sessionId,
          student_id: studentId,
          status,
          marked_by: 'correction',
          remarks: `Teacher authorized edit: ${reason.trim()}`,
        },
      ],
      actorUser
    );
  },

  calculateStudentAttendance(studentId: string, subjectId?: string) {
    return db.calculateStudentAttendance(studentId, subjectId);
  },

  calculateSubjectWiseAttendanceForStudent(studentId: string) {
    return db.calculateSubjectWiseAttendanceForStudent(studentId);
  },
};
