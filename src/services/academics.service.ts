import { demoMode, requireSupabase } from './supabaseClient';
import { getPortalInstitutionId, insertPortal } from './db/portalData';
import { db } from './db/database';
import type {
  AcademicClass,
  Department,
  Programme,
  Subject,
  VTUScheme,
} from '../types';

export const academicsService = {
  getSectionSubjects(section: AcademicClass) {
    return db.getSubjects().filter(subject =>
      subject.department_id === section.department_id && subject.semester === section.semester &&
      subject.vtu_scheme_id === section.vtu_scheme_id && (!subject.programme_id || subject.programme_id === section.programme_id)
    );
  },
  getSchemes(): VTUScheme[] {
    return db.getVTUSchemes();
  },

  async createScheme(scheme: Omit<VTUScheme, 'id'>, actorId?: string): Promise<VTUScheme> {
    if (!demoMode) return insertPortal<VTUScheme>('vtu_schemes', { ...scheme, syllabus_url: scheme.syllabus_url || null, institution_id: getPortalInstitutionId() });
    return db.createVTUScheme(scheme, actorId);
  },

  getDepartments(): Department[] {
    return db.getDepartments();
  },

  async createDepartment(dept: Omit<Department, 'id'>, actorId?: string): Promise<Department> {
    if (!demoMode) return insertPortal<Department>('departments', { ...dept, institution_id: getPortalInstitutionId() });
    return db.createDepartment(dept, actorId);
  },

  getProgrammes(): Programme[] {
    return db.getProgrammes();
  },

  getClasses(): AcademicClass[] {
    return db.getClasses();
  },

  async createClass(cls: Omit<AcademicClass, 'id'>, actorId?: string): Promise<AcademicClass> {
    if (!demoMode) {
      const { data, error } = await requireSupabase().from('semesters')
        .select('id,academic_years!inner(label,institution_id)').eq('number', cls.semester)
        .eq('academic_years.label', cls.academic_year).eq('academic_years.institution_id', getPortalInstitutionId()).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Configure this academic year and semester before adding a section.');
      return insertPortal<AcademicClass>('classes', { ...cls, semester_id: data.id });
    }
    return db.createClass(cls, actorId);
  },

  getSubjects(filter?: {
    vtu_scheme_id?: string;
    semester?: number;
    department_id?: string;
  }): Subject[] {
    return db.getSubjects(filter);
  },

  async createSubject(sub: Omit<Subject, 'id'>, actorId?: string): Promise<Subject> {
    if (!demoMode) return insertPortal<Subject>('subjects', sub);
    return db.createSubject(sub, actorId);
  },
};
