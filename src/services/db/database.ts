import {
  User,
  Department,
  Programme,
  VTUScheme,
  AcademicClass,
  Subject,
  Teacher,
  Student,
  TeacherAssignment,
  TimetableEntry,
  TimetableChangeLog,
  AttendanceSession,
  AttendanceRecord,
  CorrectionRequest,
  AcademicActivity,
  Notification,
  AuditLog,
  InstitutionSettings,
  EnrichedStudent,
  EnrichedTeacher,
  EnrichedCorrectionRequest,
  EnrichedTimetableEntry,
  AttendanceStatus,
  MarkedBy,
  DayOfWeek,
} from '../../types';
import {
  initialUsers,
  initialDepartments,
  initialProgrammes,
  initialVTUSchemes,
  initialClasses,
  initialSubjects,
  initialTeachers,
  initialStudents,
  initialTeacherAssignments,
  initialTimetable,
  initialAttendanceSessions,
  initialAttendanceRecords,
  initialCorrectionRequests,
  initialAcademicActivities,
  initialNotifications,
  initialAuditLogs,
  initialSettings,
} from './seedData';

const DB_STORAGE_KEY = 'smart_academic_portal_v6';

export interface DatabaseState {
  users: User[];
  departments: Department[];
  programmes: Programme[];
  vtuSchemes: VTUScheme[];
  classes: AcademicClass[];
  subjects: Subject[];
  teachers: Teacher[];
  students: Student[];
  teacherAssignments: TeacherAssignment[];
  timetable: TimetableEntry[];
  timetableChangeLogs: TimetableChangeLog[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  correctionRequests: CorrectionRequest[];
  academicActivities: AcademicActivity[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: InstitutionSettings;
}

class RelationalDatabase {
  private state: DatabaseState;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.error('Failed to parse database from localStorage:', e);
    }

    // Default to initial seed data
    const seed: DatabaseState = {
      users: initialUsers,
      departments: initialDepartments,
      programmes: initialProgrammes,
      vtuSchemes: initialVTUSchemes,
      classes: initialClasses,
      subjects: initialSubjects,
      teachers: initialTeachers,
      students: initialStudents,
      teacherAssignments: initialTeacherAssignments,
      timetable: initialTimetable,
      timetableChangeLogs: [],
      attendanceSessions: initialAttendanceSessions,
      attendanceRecords: initialAttendanceRecords,
      correctionRequests: initialCorrectionRequests,
      academicActivities: initialAcademicActivities,
      notifications: initialNotifications,
      auditLogs: initialAuditLogs,
      settings: initialSettings,
    };
    this.saveState(seed);
    return seed;
  }

  private saveState(state: DatabaseState): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.error('Failed to persist database state:', e);
    }
    this.state = state;
    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  public resetToSeed(): void {
    const seed: DatabaseState = {
      users: initialUsers,
      departments: initialDepartments,
      programmes: initialProgrammes,
      vtuSchemes: initialVTUSchemes,
      classes: initialClasses,
      subjects: initialSubjects,
      teachers: initialTeachers,
      students: initialStudents,
      teacherAssignments: initialTeacherAssignments,
      timetable: initialTimetable,
      timetableChangeLogs: [],
      attendanceSessions: initialAttendanceSessions,
      attendanceRecords: initialAttendanceRecords,
      correctionRequests: initialCorrectionRequests,
      academicActivities: initialAcademicActivities,
      notifications: initialNotifications,
      auditLogs: initialAuditLogs,
      settings: initialSettings,
    };
    this.saveState(seed);
  }

  // --- Audit Logging ---
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = {
      ...this.state,
      auditLogs: [newLog, ...this.state.auditLogs],
    };
    this.saveState(updated);
    return newLog;
  }

  // --- Users ---
  public getUsers(): User[] {
    return [...this.state.users];
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    const clean = email.toLowerCase().trim();
    const exact = this.state.users.find((u) => u.email.toLowerCase() === clean);
    if (exact) return exact;
    // Allow demo username fallback (e.g. admin@... -> admin@portal.edu)
    const prefix = clean.split('@')[0];
    if (['admin', 'teacher', 'student'].includes(prefix)) {
      return this.state.users.find((u) => u.email.toLowerCase().startsWith(`${prefix}@`));
    }
    return undefined;
  }

  public createUser(user: Omit<User, 'id' | 'created_at'>): User {
    if (this.getUserByEmail(user.email)) {
      throw new Error(`A user with email ${user.email} already exists.`);
    }

    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.saveState({
      ...this.state,
      users: [...this.state.users, newUser],
    });

    return newUser;
  }

  // --- VTU Schemes ---
  public getVTUSchemes(): VTUScheme[] {
    return [...this.state.vtuSchemes];
  }

  public getVTUSchemeById(id: string): VTUScheme | undefined {
    return this.state.vtuSchemes.find((s) => s.id === id);
  }

  public createVTUScheme(scheme: Omit<VTUScheme, 'id'>, actorId?: string): VTUScheme {
    const newScheme: VTUScheme = {
      ...scheme,
      id: `scheme-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      vtuSchemes: [...this.state.vtuSchemes, newScheme],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_VTU_SCHEME',
      entity: 'VTUScheme',
      entity_id: newScheme.id,
      details: `Created new regulation scheme: ${newScheme.name} (${newScheme.code})`,
    });

    return newScheme;
  }

  // --- Programmes ---
  public getProgrammes(): Programme[] {
    return [...this.state.programmes];
  }

  public createProgramme(prog: Omit<Programme, 'id'>): Programme {
    const newProg: Programme = {
      ...prog,
      id: `prog-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      programmes: [...this.state.programmes, newProg],
    });
    return newProg;
  }

  // --- Departments ---
  public getDepartments(): Department[] {
    return [...this.state.departments];
  }

  public createDepartment(dept: Omit<Department, 'id'>, actorId?: string): Department {
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      departments: [...this.state.departments, newDept],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entity_id: newDept.id,
      details: `Added new department ${newDept.name} (${newDept.code})`,
    });

    return newDept;
  }

  public updateDepartment(id: string, updates: Partial<Department>, actorId?: string): Department {
    const idx = this.state.departments.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Department not found');

    const updated = { ...this.state.departments[idx], ...updates };
    const list = [...this.state.departments];
    list[idx] = updated;

    this.saveState({ ...this.state, departments: list });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'UPDATE_DEPARTMENT',
      entity: 'Department',
      entity_id: id,
      details: `Updated department ${updated.code} configuration.`,
    });

    return updated;
  }

  // --- Classes ---
  public getClasses(): AcademicClass[] {
    return [...this.state.classes];
  }

  public createClass(cls: Omit<AcademicClass, 'id'>, actorId?: string): AcademicClass {
    const newClass: AcademicClass = {
      ...cls,
      id: `class-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      classes: [...this.state.classes, newClass],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_CLASS',
      entity: 'AcademicClass',
      entity_id: newClass.id,
      details: `Created batch/class: ${newClass.name} (Semester ${newClass.semester}, Section ${newClass.section})`,
    });

    return newClass;
  }

  // --- Subjects (VTU Code Catalogue) ---
  public getSubjects(filter?: {
    vtu_scheme_id?: string;
    semester?: number;
    department_id?: string;
  }): Subject[] {
    let result = [...this.state.subjects];
    if (filter?.vtu_scheme_id && filter.vtu_scheme_id !== 'all') {
      result = result.filter((s) => s.vtu_scheme_id === filter.vtu_scheme_id);
    }
    if (filter?.semester && filter.semester !== 0) {
      result = result.filter((s) => s.semester === filter.semester);
    }
    if (filter?.department_id && filter.department_id !== 'all') {
      result = result.filter((s) => s.department_id === filter.department_id);
    }
    return result;
  }

  public createSubject(sub: Omit<Subject, 'id'>, actorId?: string): Subject {
    const newSub: Subject = {
      ...sub,
      id: `sub-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      subjects: [...this.state.subjects, newSub],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_SUBJECT',
      entity: 'Subject',
      entity_id: newSub.id,
      details: `Registered VTU Subject ${newSub.code}: ${newSub.name} (${newSub.credits} Credits)`,
    });

    return newSub;
  }

  // --- Teachers ---
  public getTeachers(): Teacher[] {
    return [...this.state.teachers];
  }

  public getEnrichedTeachers(): EnrichedTeacher[] {
    return this.state.teachers.map((t) => {
      const user = this.getUserById(t.user_id) || {
        id: t.user_id,
        name: 'Faculty Member',
        email: 'faculty@college.edu',
        role: 'teacher',
        created_at: '',
      };
      const department = this.state.departments.find((d) => d.id === t.department_id);
      return { ...t, user, department };
    });
  }

  public createTeacher(
    userData: Omit<User, 'id' | 'created_at' | 'role'>,
    teacherData: Omit<Teacher, 'id' | 'user_id'>,
    actorId?: string
  ): EnrichedTeacher {
    if (this.state.teachers.some((t) => t.employee_id.toUpperCase() === teacherData.employee_id.toUpperCase().trim())) {
      throw new Error(`Faculty Employee ID ${teacherData.employee_id} already exists.`);
    }

    const newUser = this.createUser({
      ...userData,
      role: 'teacher',
    });

    const newTeacher: Teacher = {
      ...teacherData,
      id: `teacher-${Date.now()}`,
      user_id: newUser.id,
    };

    this.saveState({
      ...this.state,
      teachers: [...this.state.teachers, newTeacher],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_TEACHER',
      entity: 'Teacher',
      entity_id: newTeacher.id,
      details: `Created faculty record for ${newUser.name} (${newTeacher.employee_id})`,
    });

    const dept = this.state.departments.find((d) => d.id === newTeacher.department_id);
    return { ...newTeacher, user: newUser, department: dept };
  }

  // --- Students with Official Roll Number / USN ---
  public getStudents(): Student[] {
    return [...this.state.students];
  }

  public getStudentById(id: string): Student | undefined {
    return this.state.students.find((s) => s.id === id);
  }

  public getEnrichedStudents(): EnrichedStudent[] {
    return this.state.students.map((s) => {
      const user = this.getUserById(s.user_id) || {
        id: s.user_id,
        name: 'Enrolled Student',
        email: 'student@college.edu',
        role: 'student',
        created_at: '',
      };
      const department = this.state.departments.find((d) => d.id === s.department_id);
      const programme = this.state.programmes.find((p) => p.id === s.programme_id);
      const vtu_scheme = this.state.vtuSchemes.find((vs) => vs.id === s.vtu_scheme_id);
      const academic_class = this.state.classes.find((c) => c.id === s.class_id);
      return { ...s, user, department, programme, vtu_scheme, academic_class };
    });
  }

  public getEnrichedStudent(studentId: string): EnrichedStudent | undefined {
    const s = this.getStudentById(studentId);
    if (!s) return undefined;
    const user = this.getUserById(s.user_id) || {
      id: s.user_id,
      name: 'Enrolled Student',
      email: 'student@college.edu',
      role: 'student',
      created_at: '',
    };
    const department = this.state.departments.find((d) => d.id === s.department_id);
    const programme = this.state.programmes.find((p) => p.id === s.programme_id);
    const vtu_scheme = this.state.vtuSchemes.find((vs) => vs.id === s.vtu_scheme_id);
    const academic_class = this.state.classes.find((c) => c.id === s.class_id);
    return { ...s, user, department, programme, vtu_scheme, academic_class };
  }

  public createStudent(
    userData: Omit<User, 'id' | 'created_at' | 'role'>,
    studentData: Omit<Student, 'id' | 'user_id'>,
    actorId?: string
  ): EnrichedStudent {
    const rawUsn = studentData.usn || (studentData as any).roll_number || '';
    const cleanUsn = rawUsn.toUpperCase().trim();
    if (!cleanUsn) {
      throw new Error('VTU USN is required to enroll student.');
    }
    if (this.state.students.some((s) => (s.usn || s.roll_number || '').toUpperCase() === cleanUsn)) {
      throw new Error(`Student with VTU USN ${cleanUsn} already exists.`);
    }

    const newUser = this.createUser({
      ...userData,
      role: 'student',
    });

    const newStudent: Student = {
      ...studentData,
      usn: cleanUsn,
      roll_number: cleanUsn,
      id: `stu-${Date.now()}`,
      user_id: newUser.id,
    };

    this.saveState({
      ...this.state,
      students: [...this.state.students, newStudent],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'ENROLL_STUDENT',
      entity: 'Student',
      entity_id: newStudent.id,
      details: `Enrolled student ${newUser.name} with USN ${newStudent.usn} in ${newStudent.class_id}`,
    });

    return this.getEnrichedStudent(newStudent.id)!;
  }

  // --- Teacher Assignments ---
  public getTeacherAssignments(teacherId?: string): TeacherAssignment[] {
    if (teacherId) {
      return this.state.teacherAssignments.filter((ta) => ta.teacher_id === teacherId);
    }
    return [...this.state.teacherAssignments];
  }

  public assignTeacher(
    assignment: Omit<TeacherAssignment, 'id'>,
    actorId?: string
  ): TeacherAssignment {
    const existing = this.state.teacherAssignments.find(
      (ta) =>
        ta.teacher_id === assignment.teacher_id &&
        ta.subject_id === assignment.subject_id &&
        ta.class_id === assignment.class_id &&
        ta.academic_year === assignment.academic_year
    );
    if (existing) return existing;

    const newAssignment: TeacherAssignment = {
      ...assignment,
      id: `assign-${Date.now()}`,
    };

    this.saveState({
      ...this.state,
      teacherAssignments: [...this.state.teacherAssignments, newAssignment],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'ASSIGN_COURSE',
      entity: 'TeacherAssignment',
      entity_id: newAssignment.id,
      details: `Allocated subject ${assignment.subject_id} to teacher ${assignment.teacher_id} for class ${assignment.class_id}`,
    });

    return newAssignment;
  }

  // --- Timetable Management ---
  public getTimetable(filter?: {
    teacher_id?: string;
    class_id?: string;
    day_of_week?: DayOfWeek;
  }): TimetableEntry[] {
    let result = [...this.state.timetable];
    if (filter?.teacher_id) result = result.filter((t) => t.teacher_id === filter.teacher_id);
    if (filter?.class_id) result = result.filter((t) => t.class_id === filter.class_id);
    if (filter?.day_of_week) result = result.filter((t) => t.day_of_week === filter.day_of_week);
    return result.sort((a, b) => a.period_number - b.period_number);
  }

  public getEnrichedTimetable(teacherId?: string): EnrichedTimetableEntry[] {
    const raw = this.getTimetable(teacherId ? { teacher_id: teacherId } : undefined);
    const enrichedTeachers = this.getEnrichedTeachers();
    return raw.map((entry) => {
      const subject = this.state.subjects.find((s) => s.id === entry.subject_id);
      const teacher = enrichedTeachers.find((t) => t.id === entry.teacher_id);
      const academic_class = this.state.classes.find((c) => c.id === entry.class_id);
      return { ...entry, subject, teacher, academic_class };
    });
  }

  public createTimetableEntry(entry: Omit<TimetableEntry, 'id'>, actorId?: string): TimetableEntry {
    // Conflict check 1: Teacher conflict at same day & period
    const teacherConflict = this.state.timetable.find(
      (t) =>
        t.teacher_id === entry.teacher_id &&
        t.day_of_week === entry.day_of_week &&
        t.period_number === entry.period_number &&
        t.academic_year === entry.academic_year
    );
    if (teacherConflict) {
      throw new Error(`Teacher is already scheduled at this period on ${entry.day_of_week}.`);
    }

    // Conflict check 2: Classroom conflict
    const roomConflict = this.state.timetable.find(
      (t) =>
        t.classroom.toLowerCase() === entry.classroom.toLowerCase() &&
        t.day_of_week === entry.day_of_week &&
        t.period_number === entry.period_number &&
        t.academic_year === entry.academic_year
    );
    if (roomConflict) {
      throw new Error(`Classroom ${entry.classroom} is already occupied during this period.`);
    }

    const newEntry: TimetableEntry = {
      ...entry,
      id: `tt-${Date.now()}`,
    };

    this.saveState({
      ...this.state,
      timetable: [...this.state.timetable, newEntry],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_TIMETABLE_SLOT',
      entity: 'TimetableEntry',
      entity_id: newEntry.id,
      details: `Scheduled ${entry.day_of_week} Period ${entry.period_number} in ${entry.classroom}`,
    });

    return newEntry;
  }

  public deleteTimetableEntry(id: string, actorId?: string): void {
    this.saveState({
      ...this.state,
      timetable: this.state.timetable.filter((t) => t.id !== id),
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'DELETE_TIMETABLE_SLOT',
      entity: 'TimetableEntry',
      entity_id: id,
      details: `Deleted timetable entry ${id}`,
    });
  }

  // --- Attendance Sessions ---
  public getSessions(filter?: {
    class_id?: string;
    subject_id?: string;
    teacher_id?: string;
    date?: string;
  }): AttendanceSession[] {
    let result = [...this.state.attendanceSessions];
    if (filter?.class_id) result = result.filter((s) => s.class_id === filter.class_id);
    if (filter?.subject_id) result = result.filter((s) => s.subject_id === filter.subject_id);
    if (filter?.teacher_id) result = result.filter((s) => s.teacher_id === filter.teacher_id);
    if (filter?.date) result = result.filter((s) => s.date === filter.date);
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getSessionById(id: string): AttendanceSession | undefined {
    return this.state.attendanceSessions.find((s) => s.id === id);
  }

  public createSession(
    data: Omit<AttendanceSession, 'id' | 'created_at'>,
    actorId?: string
  ): AttendanceSession {
    const newSession: AttendanceSession = {
      ...data,
      id: `sess-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    this.saveState({
      ...this.state,
      attendanceSessions: [newSession, ...this.state.attendanceSessions],
    });

    const sub = this.state.subjects.find((s) => s.id === data.subject_id);
    const cls = this.state.classes.find((c) => c.id === data.class_id);

    this.logAudit({
      user_id: actorId || 'teacher',
      user_name: 'Faculty',
      user_role: 'teacher',
      action: 'CREATE_ATTENDANCE_SESSION',
      entity: 'AttendanceSession',
      entity_id: newSession.id,
      details: `Initiated session for ${cls?.name || data.class_id}, Subject ${sub?.code || data.subject_id} (Code: ${data.code || 'None'})`,
    });

    return newSession;
  }

  public endSessionCode(sessionId: string, actorId?: string): void {
    const idx = this.state.attendanceSessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return;

    const session = this.state.attendanceSessions[idx];
    const updated: AttendanceSession = {
      ...session,
      is_code_active: false,
      code_expires_at: new Date().toISOString(),
    };

    const list = [...this.state.attendanceSessions];
    list[idx] = updated;

    this.saveState({ ...this.state, attendanceSessions: list });

    this.logAudit({
      user_id: actorId || 'teacher',
      user_name: 'Faculty',
      user_role: 'teacher',
      action: 'CLOSE_ATTENDANCE_CODE',
      entity: 'AttendanceSession',
      entity_id: sessionId,
      details: `Deactivated attendance code for session ${sessionId}`,
    });
  }

  // --- Attendance Records & Duplicate Prevention ---
  public getRecords(sessionId?: string): AttendanceRecord[] {
    if (sessionId) {
      return this.state.attendanceRecords.filter((r) => r.session_id === sessionId);
    }
    return [...this.state.attendanceRecords];
  }

  public getStudentRecord(sessionId: string, studentId: string): AttendanceRecord | undefined {
    return this.state.attendanceRecords.find(
      (r) => r.session_id === sessionId && r.student_id === studentId
    );
  }

  public markAttendanceBatch(
    records: {
      session_id: string;
      student_id: string;
      status: AttendanceStatus;
      marked_by: MarkedBy;
      remarks?: string;
    }[],
    actorUser: User
  ): void {
    if (!records.length) return;

    const existingMap = new Map<string, AttendanceRecord>();
    this.state.attendanceRecords.forEach((r) => {
      existingMap.set(`${r.session_id}_${r.student_id}`, r);
    });

    const now = new Date().toISOString();
    const updatedList = [...this.state.attendanceRecords];

    records.forEach((item) => {
      const key = `${item.session_id}_${item.student_id}`;
      const existing = existingMap.get(key);

      if (existing) {
        const index = updatedList.findIndex((r) => r.id === existing.id);
        if (index !== -1) {
          updatedList[index] = {
            ...existing,
            status: item.status,
            marked_by: item.marked_by,
            remarks: item.remarks ?? existing.remarks,
            updated_at: now,
          };
        }
      } else {
        const newRecord: AttendanceRecord = {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          session_id: item.session_id,
          student_id: item.student_id,
          status: item.status,
          marked_by: item.marked_by,
          remarks: item.remarks,
          updated_at: now,
        };
        updatedList.push(newRecord);
        existingMap.set(key, newRecord);
      }
    });

    this.saveState({
      ...this.state,
      attendanceRecords: updatedList,
    });

    const sampleSession = this.getSessionById(records[0].session_id);
    const sub = sampleSession ? this.state.subjects.find((s) => s.id === sampleSession.subject_id) : undefined;

    this.logAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      action: 'MARK_ATTENDANCE_BATCH',
      entity: 'AttendanceRecord',
      entity_id: records[0].session_id,
      details: `Saved attendance for ${records.length} students in ${sub?.code || 'Course'}.`,
    });
  }

  // --- Student Proxy Prevention Check-In ---
  public submitAttendanceCode(
    studentId: string,
    code: string,
    ipAddress: string = '127.0.0.1'
  ): { success: boolean; message: string; session: AttendanceSession } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Student record not found.');

    const cleanCode = code.trim().toUpperCase();
    const session = this.state.attendanceSessions.find(
      (s) => s.code && s.code.trim().toUpperCase() === cleanCode
    );

    if (!session) throw new Error('Invalid attendance code. Please check with your faculty in-charge.');
    if (!session.is_code_active) throw new Error('This attendance session window has concluded.');
    if (session.code_expires_at && new Date() > new Date(session.code_expires_at)) {
      throw new Error('This attendance code has expired.');
    }

    if (student.class_id !== session.class_id) {
      throw new Error('You are not registered in the class section for this session.');
    }

    const existing = this.getStudentRecord(session.id, student.id);
    if (existing && existing.status === 'present') {
      throw new Error('You have already registered your attendance for this lecture.');
    }

    const now = new Date().toISOString();
    const updatedRecords = [...this.state.attendanceRecords];

    if (existing) {
      const idx = updatedRecords.findIndex((r) => r.id === existing.id);
      updatedRecords[idx] = {
        ...existing,
        status: 'present',
        marked_by: 'code',
        remarks: `Code verified: ${cleanCode}`,
        updated_at: now,
      };
    } else {
      updatedRecords.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        session_id: session.id,
        student_id: student.id,
        status: 'present',
        marked_by: 'code',
        remarks: `Code verified: ${cleanCode}`,
        updated_at: now,
      });
    }

    this.saveState({ ...this.state, attendanceRecords: updatedRecords });

    const stuUser = this.getUserById(student.user_id);
    const sub = this.state.subjects.find((s) => s.id === session.subject_id);

    this.logAudit({
      user_id: stuUser?.id || student.id,
      user_name: stuUser?.name || 'Student',
      user_role: 'student',
      action: 'CODE_ATTENDANCE_CHECKIN',
      entity: 'AttendanceRecord',
      entity_id: session.id,
      details: `Student ${stuUser?.name} (USN: ${student.usn}) verified attendance for ${sub?.code || 'Course'}`,
      ip_address: ipAddress,
    });

    if (stuUser) {
      this.createNotification({
        user_id: stuUser.id,
        title: 'Attendance Recorded',
        message: `Your presence for ${sub?.code || 'course'} on ${session.date} was verified successfully.`,
        type: 'success',
      });
    }

    return {
      success: true,
      message: `Attendance marked successfully for ${sub?.code} (${sub?.name})!`,
      session,
    };
  }

  // --- Attendance Correction Requests ---
  public getCorrectionRequests(): CorrectionRequest[] {
    return [...this.state.correctionRequests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getEnrichedCorrectionRequests(teacherId?: string): EnrichedCorrectionRequest[] {
    const list = this.getCorrectionRequests();
    const enriched = list.map((cr) => {
      const student = this.getEnrichedStudent(cr.student_id)!;
      const subject = this.state.subjects.find((s) => s.id === cr.subject_id);
      const session = this.state.attendanceSessions.find((s) => s.id === cr.session_id);
      const reviewer = cr.reviewed_by
        ? this.getEnrichedTeachers().find((t) => t.id === cr.reviewed_by)
        : undefined;
      return { ...cr, student, subject, session, reviewer };
    });

    if (teacherId) {
      const assignments = this.getTeacherAssignments(teacherId);
      const allowedSubjectIds = new Set(assignments.map((a) => a.subject_id));
      return enriched.filter((item) => allowedSubjectIds.has(item.subject_id));
    }

    return enriched;
  }

  public createCorrectionRequest(data: Omit<CorrectionRequest, 'id' | 'created_at' | 'status'>): CorrectionRequest {
    const newRequest: CorrectionRequest = {
      ...data,
      id: `corr-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      reviewed_by: null,
      review_notes: null,
      reviewed_at: null,
    };

    this.saveState({
      ...this.state,
      correctionRequests: [newRequest, ...this.state.correctionRequests],
    });

    const student = this.getEnrichedStudent(data.student_id);
    const session = this.getSessionById(data.session_id);
    const sub = this.state.subjects.find((s) => s.id === data.subject_id);

    if (session) {
      const teacher = this.state.teachers.find((t) => t.id === session.teacher_id);
      if (teacher) {
        this.createNotification({
          user_id: teacher.user_id,
          title: 'New Correction Request',
          message: `Student ${student?.user.name} (${student?.usn}) submitted a correction request for ${sub?.code || 'Course'}.`,
          type: 'info',
          link: '/teacher/corrections',
        });
      }
    }

    return newRequest;
  }

  public reviewCorrectionRequest(
    requestId: string,
    action: 'approved' | 'rejected',
    teacherId: string,
    reviewNotes: string,
    actorUser: User
  ): CorrectionRequest {
    const reqIndex = this.state.correctionRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) throw new Error('Correction request not found.');

    const request = this.state.correctionRequests[reqIndex];
    const now = new Date().toISOString();

    const updatedRequest: CorrectionRequest = {
      ...request,
      status: action,
      reviewed_by: teacherId,
      review_notes: reviewNotes,
      reviewed_at: now,
    };

    const newRequests = [...this.state.correctionRequests];
    newRequests[reqIndex] = updatedRequest;

    let updatedRecords = [...this.state.attendanceRecords];

    if (action === 'approved') {
      const record = this.getStudentRecord(request.session_id, request.student_id);
      if (record) {
        const rIdx = updatedRecords.findIndex((r) => r.id === record.id);
        updatedRecords[rIdx] = {
          ...record,
          status: request.requested_status,
          marked_by: 'correction',
          remarks: `Faculty authorized update: ${reviewNotes}`,
          updated_at: now,
        };
      } else {
        updatedRecords.push({
          id: `rec-${Date.now()}`,
          session_id: request.session_id,
          student_id: request.student_id,
          status: request.requested_status,
          marked_by: 'correction',
          remarks: `Faculty authorized update: ${reviewNotes}`,
          updated_at: now,
        });
      }
    }

    this.saveState({
      ...this.state,
      correctionRequests: newRequests,
      attendanceRecords: updatedRecords,
    });

    const student = this.getEnrichedStudent(request.student_id);
    const sub = this.state.subjects.find((s) => s.id === request.subject_id);

    if (student) {
      this.createNotification({
        user_id: student.user_id,
        title: action === 'approved' ? 'Correction Approved' : 'Correction Rejected',
        message:
          action === 'approved'
            ? `Your attendance for ${sub?.code} on ${request.date} was updated to ${request.requested_status.toUpperCase()}.`
            : `Your correction request for ${sub?.code} was declined: ${reviewNotes}`,
        type: action === 'approved' ? 'success' : 'alert',
        link: '/student/corrections',
      });
    }

    this.logAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      action: action === 'approved' ? 'APPROVE_CORRECTION' : 'REJECT_CORRECTION',
      entity: 'CorrectionRequest',
      entity_id: requestId,
      details: `${action.toUpperCase()} dispute for student USN ${student?.usn}: ${reviewNotes}`,
    });

    return updatedRequest;
  }

  // --- Academic Activities ---
  public getAcademicActivities(): AcademicActivity[] {
    return [...this.state.academicActivities];
  }

  public createAcademicActivity(act: Omit<AcademicActivity, 'id'>, actorId?: string): AcademicActivity {
    const newAct: AcademicActivity = {
      ...act,
      id: `act-${Date.now()}`,
    };
    this.saveState({
      ...this.state,
      academicActivities: [...this.state.academicActivities, newAct],
    });

    this.logAudit({
      user_id: actorId || 'admin',
      user_name: 'Admin',
      user_role: 'admin',
      action: 'CREATE_ACADEMIC_ACTIVITY',
      entity: 'AcademicActivity',
      entity_id: newAct.id,
      details: `Registered academic activity ${newAct.name} (${newAct.course_code})`,
    });

    return newAct;
  }

  // --- Timetable Conflict Checking & Rescheduling ---
  public checkTimetableConflict(
    teacherId: string,
    classId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    classroom: string,
    excludeEntryId?: string
  ): { hasConflict: boolean; conflictType?: 'teacher' | 'classroom' | 'class'; message?: string } {
    const activeSlots = this.state.timetable.filter((t) => t.id !== excludeEntryId);

    // 1. Teacher conflict (Teacher already booked at same day & period)
    const teacherConflict = activeSlots.find(
      (t) => t.teacher_id === teacherId && t.day_of_week === dayOfWeek && t.period_number === periodNumber
    );
    if (teacherConflict) {
      return {
        hasConflict: true,
        conflictType: 'teacher',
        message: `Teacher schedule conflict: You are already assigned to ${teacherConflict.classroom} for Period ${periodNumber} on ${dayOfWeek}.`,
      };
    }

    // 2. Classroom conflict (Classroom occupied by another class at same day & period)
    const roomConflict = activeSlots.find(
      (t) =>
        t.classroom.trim().toLowerCase() === classroom.trim().toLowerCase() &&
        t.day_of_week === dayOfWeek &&
        t.period_number === periodNumber
    );
    if (roomConflict) {
      return {
        hasConflict: true,
        conflictType: 'classroom',
        message: `Classroom conflict: ${classroom} is already occupied during Period ${periodNumber} on ${dayOfWeek}.`,
      };
    }

    // 3. Class section conflict (The student class/section already has another class at this period)
    const classConflict = activeSlots.find(
      (t) => t.class_id === classId && t.day_of_week === dayOfWeek && t.period_number === periodNumber
    );
    if (classConflict) {
      return {
        hasConflict: true,
        conflictType: 'class',
        message: `Class schedule conflict: Students of ${classId} already have a class scheduled for Period ${periodNumber} on ${dayOfWeek}.`,
      };
    }

    return { hasConflict: false };
  }

  public rescheduleTimetableSlot(
    params: {
      entryId: string;
      newDay: DayOfWeek;
      newPeriod: number;
      newStartTime: string;
      newEndTime: string;
      newClassroom: string;
      reason: string;
    },
    actorUser: User
  ): TimetableEntry {
    const entry = this.state.timetable.find((t) => t.id === params.entryId);
    if (!entry) throw new Error('Timetable entry not found.');

    // Security: Only the assigned teacher or Admin can modify the timetable
    const currentTeacher = this.state.teachers.find((t) => t.user_id === actorUser.id);
    if (actorUser.role !== 'admin' && (!currentTeacher || currentTeacher.id !== entry.teacher_id)) {
      throw new Error('Unauthorized: You can only modify timetable slots assigned to you.');
    }

    // Check for collisions
    const conflict = this.checkTimetableConflict(
      entry.teacher_id,
      entry.class_id,
      params.newDay,
      params.newPeriod,
      params.newClassroom,
      entry.id
    );
    if (conflict.hasConflict) {
      throw new Error(conflict.message || 'Timetable scheduling conflict detected.');
    }

    const oldDay = entry.day_of_week;
    const oldPeriod = entry.period_number;
    const oldClassroom = entry.classroom;

    const updatedEntry: TimetableEntry = {
      ...entry,
      day_of_week: params.newDay,
      period_number: params.newPeriod,
      start_time: params.newStartTime,
      end_time: params.newEndTime,
      classroom: params.newClassroom,
    };

    const subject = this.state.subjects.find((s) => s.id === entry.subject_id);
    const academicClass = this.state.classes.find((c) => c.id === entry.class_id);

    const changeLog: TimetableChangeLog = {
      id: `tt-log-${Date.now()}`,
      timetable_entry_id: entry.id,
      teacher_id: entry.teacher_id,
      teacher_name: actorUser.name,
      class_id: entry.class_id,
      class_name: academicClass?.name || entry.class_id,
      subject_code: subject?.code || '',
      subject_name: subject?.name || '',
      old_day: oldDay,
      old_period: oldPeriod,
      old_classroom: oldClassroom,
      new_day: params.newDay,
      new_period: params.newPeriod,
      new_classroom: params.newClassroom,
      change_type: 'reschedule',
      reason: params.reason.trim(),
      timestamp: new Date().toISOString(),
      status: 'applied',
    };

    // Update state
    this.saveState({
      ...this.state,
      timetable: this.state.timetable.map((t) => (t.id === entry.id ? updatedEntry : t)),
      timetableChangeLogs: [changeLog, ...(this.state.timetableChangeLogs || [])],
    });

    // Notify all affected enrolled students
    const affectedStudents = this.state.students.filter((s) => s.class_id === entry.class_id);
    affectedStudents.forEach((student) => {
      this.createNotification({
        user_id: student.user_id,
        title: `Timetable Notice: ${subject?.code} Rescheduled`,
        message: `${subject?.code} (${subject?.name}) has been rescheduled by ${actorUser.name} to ${params.newDay} Period ${params.newPeriod} (${params.newStartTime} - ${params.newEndTime}) in ${params.newClassroom}. Reason: ${params.reason}`,
        type: 'info',
        link: '/student/timetable',
      });
    });

    // Also notify Admin
    const adminUser = this.state.users.find((u) => u.role === 'admin');
    if (adminUser) {
      this.createNotification({
        user_id: adminUser.id,
        title: `Timetable Update: ${subject?.code} by ${actorUser.name}`,
        message: `${actorUser.name} rescheduled ${subject?.code} for class ${academicClass?.name} to ${params.newDay} Period ${params.newPeriod}.`,
        type: 'info',
        link: '/admin/timetable',
      });
    }

    this.logAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      action: 'RESCHEDULE_TIMETABLE_SLOT',
      entity: 'TimetableEntry',
      entity_id: entry.id,
      details: `Rescheduled ${subject?.code} from ${oldDay} P${oldPeriod} to ${params.newDay} P${params.newPeriod} in ${params.newClassroom}. Reason: ${params.reason}`,
    });

    return updatedEntry;
  }

  public getTimetableChangeLogs(teacherId?: string): TimetableChangeLog[] {
    const logs = this.state.timetableChangeLogs || [];
    if (teacherId) {
      return logs.filter((l) => l.teacher_id === teacherId);
    }
    return [...logs];
  }

  // --- Notifications ---
  public getNotifications(userId: string): Notification[] {
    return this.state.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createNotification(data: Omit<Notification, 'id' | 'created_at' | 'is_read'>): Notification {
    const newNotif: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.saveState({
      ...this.state,
      notifications: [newNotif, ...this.state.notifications],
    });
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const idx = this.state.notifications.findIndex((n) => n.id === id);
    if (idx === -1) return;
    const list = [...this.state.notifications];
    list[idx] = { ...list[idx], is_read: true };
    this.saveState({ ...this.state, notifications: list });
  }

  public markAllNotificationsAsRead(userId: string): void {
    const list = this.state.notifications.map((n) => (n.user_id === userId ? { ...n, is_read: true } : n));
    this.saveState({ ...this.state, notifications: list });
  }

  // --- Audit Logs ---
  public getAuditLogs(limit: number = 100): AuditLog[] {
    return [...this.state.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // --- Settings ---
  public getSettings(): InstitutionSettings {
    return { ...this.state.settings };
  }

  public updateSettings(updates: Partial<InstitutionSettings>, actorUser: User): InstitutionSettings {
    const updated = { ...this.state.settings, ...updates };
    this.saveState({ ...this.state, settings: updated });

    this.logAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      action: 'UPDATE_SETTINGS',
      entity: 'InstitutionSettings',
      entity_id: updated.id,
      details: `Updated settings: Threshold=${updated.threshold_percentage}%, Term=${updated.academic_term}`,
    });

    return updated;
  }

  // --- Analytics & VTU Attendance Formula ---
  // Formula: Attendance Percentage = (Classes Attended / Total Countable Classes Conducted) * 100
  public calculateStudentAttendance(
    studentId: string,
    subjectId?: string
  ): {
    totalSessions: number;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical';
  } {
    const student = this.getStudentById(studentId);
    if (!student) {
      return { totalSessions: 0, present: 0, absent: 0, leave: 0, percentage: 0, status: 'safe' };
    }

    let relevantSessions = this.state.attendanceSessions.filter((s) => s.class_id === student.class_id);
    if (subjectId) {
      relevantSessions = relevantSessions.filter((s) => s.subject_id === subjectId);
    }

    const sessionIds = new Set(relevantSessions.map((s) => s.id));
    const studentRecords = this.state.attendanceRecords.filter(
      (r) => r.student_id === studentId && sessionIds.has(r.session_id)
    );

    let present = 0;
    let absent = 0;
    let leave = 0;

    studentRecords.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'leave') leave++;
    });

    const totalSessions = studentRecords.length;
    // Configurable counting rule: check if leave counts towards attended or denominator
    const attendedCount = this.state.settings.leave_counts_as_present ? present + leave : present;
    const percentage = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 1000) / 10 : 100;

    const threshold = this.state.settings.threshold_percentage;
    const warning = this.state.settings.warning_threshold;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (percentage < threshold) status = 'critical';
    else if (percentage < warning) status = 'warning';

    return { totalSessions, present, absent, leave, percentage, status };
  }

  public calculateSubjectWiseAttendanceForStudent(studentId: string): {
    subject: Subject;
    total: number;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical';
    trend: 'improving' | 'declining' | 'stable';
  }[] {
    const student = this.getStudentById(studentId);
    if (!student) return [];

    // Filter subjects by the student's VTU scheme and semester
    const eligibleSubjects = this.state.subjects.filter(
      (s) => s.vtu_scheme_id === student.vtu_scheme_id && s.semester === student.current_semester
    );

    return eligibleSubjects.map((sub) => {
      const stats = this.calculateStudentAttendance(studentId, sub.id);
      return {
        subject: sub,
        total: stats.totalSessions,
        present: stats.present,
        absent: stats.absent,
        leave: stats.leave,
        percentage: stats.percentage,
        status: stats.status,
        trend: 'stable' as const,
      };
    });
  }

  public getLowAttendanceStudents(threshold?: number): {
    student: EnrichedStudent;
    overallPercentage: number;
    totalClasses: number;
    attended: number;
    missed: number;
    status: 'warning' | 'critical';
    declining: boolean;
  }[] {
    const cutoff = threshold ?? this.state.settings.threshold_percentage;
    const enriched = this.getEnrichedStudents();

    const result = enriched.map((student) => {
      const stats = this.calculateStudentAttendance(student.id);
      return {
        student,
        overallPercentage: stats.percentage,
        totalClasses: stats.totalSessions,
        attended: stats.present,
        missed: stats.absent,
        status: stats.status === 'safe' ? ('warning' as const) : stats.status,
        declining: stats.absent >= 2,
      };
    });

    return result.filter((item) => item.overallPercentage < cutoff || item.declining);
  }

  public getAttendanceTrend(days: number = 7): {
    date: string;
    displayDate: string;
    total: number;
    present: number;
    absent: number;
    leave: number;
    percentage: number;
  }[] {
    const map = new Map<string, { present: number; absent: number; leave: number }>();
    const dates: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      dates.push(iso);
      map.set(iso, { present: 0, absent: 0, leave: 0 });
    }

    this.state.attendanceSessions.forEach((session) => {
      if (map.has(session.date)) {
        const entry = map.get(session.date)!;
        const records = this.state.attendanceRecords.filter((r) => r.session_id === session.id);
        records.forEach((r) => {
          if (r.status === 'present') entry.present++;
          else if (r.status === 'absent') entry.absent++;
          else if (r.status === 'leave') entry.leave++;
        });
      }
    });

    return dates.map((dt) => {
      const counts = map.get(dt) || { present: 0, absent: 0, leave: 0 };
      const total = counts.present + counts.absent + counts.leave;
      const percentage = total > 0 ? Math.round((counts.present / total) * 1000) / 10 : 88.5;
      const dObj = new Date(dt);
      const displayDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: dt,
        displayDate,
        total: total > 0 ? total : 20,
        present: total > 0 ? counts.present : 18,
        absent: total > 0 ? counts.absent : 2,
        leave: total > 0 ? counts.leave : 0,
        percentage,
      };
    });
  }

  public getDepartmentStats(): {
    department: Department;
    studentCount: number;
    teacherCount: number;
    averageAttendance: number;
  }[] {
    return this.state.departments.slice(0, 6).map((dept) => {
      const deptStudents = this.state.students.filter((s) => s.department_id === dept.id);
      const deptTeachers = this.state.teachers.filter((t) => t.department_id === dept.id);

      let totalPct = 0;
      deptStudents.forEach((s) => {
        totalPct += this.calculateStudentAttendance(s.id).percentage;
      });
      const avg = deptStudents.length > 0 ? Math.round((totalPct / deptStudents.length) * 10) / 10 : 85.0;

      return {
        department: dept,
        studentCount: deptStudents.length,
        teacherCount: deptTeachers.length,
        averageAttendance: avg,
      };
    });
  }
}

export const db = new RelationalDatabase();
