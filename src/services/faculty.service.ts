import { demoMode } from './supabaseClient';
import { insertPortal } from './db/portalData';
import { db } from './db/database';
import type {
  AcademicClass,
  EnrichedTeacher,
  Subject,
  Teacher,
  TeacherAssignment,
  User,
} from '../types';

export const facultyService = {
  getTeachers(): Teacher[] {
    return db.getTeachers();
  },

  getEnrichedTeachers(): EnrichedTeacher[] {
    return db.getEnrichedTeachers();
  },

  createTeacher(
    userData: Omit<User, 'id' | 'created_at' | 'role'>,
    teacherData: Omit<Teacher, 'id' | 'user_id'>,
    actorId?: string
  ): EnrichedTeacher {
    if (!demoMode) throw new Error('Faculty accounts are provisioned by an authorized operator.');
    if (!userData.email.endsWith('.example')) throw new Error('Use a fictional .example email address in demo mode.');
    return db.createTeacher(userData, teacherData, actorId);
  },

  getAssignments(teacherId?: string): TeacherAssignment[] {
    return db.getTeacherAssignments(teacherId);
  },

  getAssignedClassesAndSubjects(teacherId: string): {
    assignments: TeacherAssignment[];
    classes: AcademicClass[];
    subjects: Subject[];
    assignedClassIds: Set<string>;
    assignedSubjectIds: Set<string>;
  } {
    const assignments = db.getTeacherAssignments(teacherId);
    const assignedClassIds = new Set(assignments.map((a) => a.class_id));
    const assignedSubjectIds = new Set(assignments.map((a) => a.subject_id));
    const classes = db.getClasses().filter((c) => assignedClassIds.has(c.id));
    const subjects = db.getSubjects().filter((s) => assignedSubjectIds.has(s.id));

    return { assignments, classes, subjects, assignedClassIds, assignedSubjectIds };
  },

  async assignTeacher(
    assignment: Omit<TeacherAssignment, 'id'>,
    actorId?: string
  ): Promise<TeacherAssignment> {
    if (!demoMode) return insertPortal<TeacherAssignment>('teacher_assignments', assignment);
    return db.assignTeacher(assignment, actorId);
  },
};
