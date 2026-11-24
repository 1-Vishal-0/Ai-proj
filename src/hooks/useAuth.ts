import { createContext, useContext } from 'react';
import type { EnrichedStudent, EnrichedTeacher, User } from '../types';

export interface AuthContextType {
  currentUser: User | null;
  currentStudent: EnrichedStudent | null;
  currentTeacher: EnrichedTeacher | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectDemoAccount?: (userId: string) => void;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  canSetPassword: boolean;
  setPassword: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
