import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, EnrichedStudent, EnrichedTeacher, UserRole } from '../types';
import { db } from '../services/db/database';

interface AuthContextType {
  currentUser: User | null;
  currentStudent: EnrichedStudent | null;
  currentTeacher: EnrichedTeacher | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'smart_attendance_auth_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentStudent, setCurrentStudent] = useState<EnrichedStudent | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<EnrichedTeacher | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync profile when currentUser changes
  const refreshUserProfiles = (user: User | null) => {
    if (!user) {
      setCurrentStudent(null);
      setCurrentTeacher(null);
      return;
    }

    if (user.role === 'student') {
      const stu = db.getEnrichedStudents().find((s) => s.user_id === user.id);
      setCurrentStudent(stu || null);
      setCurrentTeacher(null);
    } else if (user.role === 'teacher') {
      const tch = db.getEnrichedTeachers().find((t) => t.user_id === user.id);
      setCurrentTeacher(tch || null);
      setCurrentStudent(null);
    } else {
      setCurrentStudent(null);
      setCurrentTeacher(null);
    }
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem(AUTH_USER_KEY);
    if (savedUserId) {
      const user = db.getUserById(savedUserId);
      if (user) {
        setCurrentUser(user);
        refreshUserProfiles(user);
      } else {
        // Fallback to default admin
        const defaultAdmin = db.getUsers().find((u) => u.role === 'admin');
        if (defaultAdmin) {
          setCurrentUser(defaultAdmin);
          localStorage.setItem(AUTH_USER_KEY, defaultAdmin.id);
          refreshUserProfiles(defaultAdmin);
        }
      }
    } else {
      // Default to demo admin for initial arrival
      const defaultAdmin = db.getUsers().find((u) => u.role === 'admin');
      if (defaultAdmin) {
        setCurrentUser(defaultAdmin);
        localStorage.setItem(AUTH_USER_KEY, defaultAdmin.id);
        refreshUserProfiles(defaultAdmin);
      }
    }
    setIsLoading(false);

    // Subscribe to DB updates
    const unsubscribe = db.subscribe(() => {
      const savedId = localStorage.getItem(AUTH_USER_KEY);
      if (savedId) {
        const u = db.getUserById(savedId);
        if (u) {
          setCurrentUser(u);
          refreshUserProfiles(u);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const user = db.getUserByEmail(email);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    if (password && user.password_hash && password !== user.password_hash && password !== 'password123') {
      throw new Error('Incorrect password entered.');
    }

    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, user.id);
    refreshUserProfiles(user);

    db.logAudit({
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: 'USER_LOGIN',
      entity: 'User',
      entity_id: user.id,
      details: `${user.name} logged in successfully as ${user.role.toUpperCase()}`,
    });

    return true;
  };

  const logout = () => {
    if (currentUser) {
      db.logAudit({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        action: 'USER_LOGOUT',
        entity: 'User',
        entity_id: currentUser.id,
        details: `${currentUser.name} signed out.`,
      });
    }
    setCurrentUser(null);
    setCurrentStudent(null);
    setCurrentTeacher(null);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const switchRole = (role: UserRole) => {
    const targetUser = db.getUsers().find((u) => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      localStorage.setItem(AUTH_USER_KEY, targetUser.id);
      refreshUserProfiles(targetUser);
    }
  };

  const loginAsUser = (userId: string) => {
    const target = db.getUserById(userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem(AUTH_USER_KEY, target.id);
      refreshUserProfiles(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentStudent,
        currentTeacher,
        login,
        logout,
        switchRole,
        loginAsUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
