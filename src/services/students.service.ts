import { demoMode } from './supabaseClient';
import { db } from './db/database';
import type { EnrichedStudent, Student, User } from '../types';

export const studentsService = {
  getStudents(): Student[] {
    return db.getStudents();
  },

  getEnrichedStudents(): EnrichedStudent[] {
    return db.getEnrichedStudents();
  },

  getEnrichedStudentsByClass(classId: string, date?: string): EnrichedStudent[] {
    if (demoMode || !date) return db.getEnrichedStudents().filter((student) => student.class_id === classId);
    const ids = new Set(db.getEnrollments().filter((entry) =>
      entry.class_id === classId && entry.enrolled_from <= date && (!entry.enrolled_until || entry.enrolled_until >= date)
    ).map((entry) => entry.student_id));
    return db.getEnrichedStudents().filter((student) => ids.has(student.id));
  },

  getEnrichedStudent(studentId: string): EnrichedStudent | undefined {
    return db.getEnrichedStudent(studentId);
  },

  enrollStudent(
    userData: Omit<User, 'id' | 'created_at' | 'role'>,
    studentData: Omit<Student, 'id' | 'user_id'>,
    actorId?: string
  ): EnrichedStudent {
    if (!demoMode) throw new Error('Student accounts are provisioned by an authorized operator.');
    if (!userData.email.endsWith('.example') || (studentData.guardian_email && !studentData.guardian_email.endsWith('.example'))) {
      throw new Error('Use a fictional .example email address in demo mode.');
    }
    return db.createStudent(userData, studentData, actorId);
  },
};
