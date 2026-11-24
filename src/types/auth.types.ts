export type UserRole = 'admin' | 'hod' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  enabled?: boolean;
  auth_linked?: boolean;
  archived_at?: string | null;
  institution_id?: string;
  department_id?: string | null;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

