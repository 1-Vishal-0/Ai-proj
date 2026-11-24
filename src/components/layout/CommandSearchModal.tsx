import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, Search, Users, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NAV_BY_ROLE, ROUTES } from '../../app/config/navigation';
import { academicsService } from '../../services/academics.service';
import { studentsService } from '../../services/students.service';
import { facultyService } from '../../services/faculty.service';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  category: 'Navigation' | 'Courses' | 'Students' | 'Faculty';
  title: string;
  subtitle: string;
  path: string;
  icon: React.ReactNode;
}

export const CommandSearchModal: React.FC<CommandSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const role = currentUser?.role || 'admin';

  const results = useMemo<SearchResultItem[]>(() => {
    if (!isOpen) return [];
    const q = query.trim().toLowerCase();

    const items: SearchResultItem[] = [];

    // 1. Role Navigation Pages
    NAV_BY_ROLE[role].forEach((nav) => {
      const NavIcon = nav.icon;
      if (!q || nav.label.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${nav.path}`,
          category: 'Navigation',
          title: nav.label,
          subtitle: nav.path,
          path: nav.path,
          icon: <NavIcon className="w-4 h-4 text-secondary" />,
        });
      }
    });

    if (q.length >= 1) {
      // 2. Subjects
      const targetSubjectRoute =
        role === 'admin'
          ? ROUTES.ADMIN_SUBJECTS
          : role === 'teacher'
          ? ROUTES.TEACHER_TIMETABLE
          : ROUTES.STUDENT_OVERVIEW;

      academicsService
        .getSubjects()
        .filter(
          (s) =>
            s.code.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.abbreviation.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach((s) => {
          items.push({
            id: `sub-${s.id}`,
            category: 'Courses',
            title: `${s.code} — ${s.name}`,
            subtitle: `Sem ${s.semester} • ${s.credits} Credits`,
            path: targetSubjectRoute,
            icon: <BookOpen className="w-4 h-4 text-brand-500" />,
          });
        });

      // 3. Students (Admin & Teacher only)
      if (role === 'admin' || role === 'teacher') {
        const studentRoute =
          role === 'admin' ? ROUTES.ADMIN_STUDENTS : ROUTES.TEACHER_MARK;
        studentsService
          .getEnrichedStudents()
          .filter(
            (st) =>
              st.user.name.toLowerCase().includes(q) ||
              st.usn.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .forEach((st) => {
            items.push({
              id: `stu-${st.id}`,
              category: 'Students',
              title: st.user.name,
              subtitle: `${st.usn} • ${st.academic_class?.name || st.class_id}`,
              path: studentRoute,
              icon: <Users className="w-4 h-4 text-emerald-500" />,
            });
          });
      }

      // 4. Faculty (Admin only)
      if (role === 'admin') {
        facultyService
          .getEnrichedTeachers()
          .filter(
            (t) =>
              t.user.name.toLowerCase().includes(q) ||
              t.employee_id.toLowerCase().includes(q)
          )
          .slice(0, 4)
          .forEach((t) => {
            items.push({
              id: `tch-${t.id}`,
              category: 'Faculty',
              title: t.user.name,
              subtitle: `${t.employee_id} • ${t.designation}`,
              path: ROUTES.ADMIN_TEACHERS,
              icon: <GraduationCap className="w-4 h-4 text-amber-500" />,
            });
          });
      }
    }

    return items.slice(0, 14);
  }, [isOpen, query, role]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contextual Search"
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:pt-20"
    >
      <div
        className="fixed inset-0 bg-slate-950/50"
        onClick={onClose}
      />

      <div
        className="relative mx-auto max-w-lg rounded-xl border border-border bg-surface shadow-float overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 h-12">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to page, course code (BCS501), or student USN..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-muted hover:text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-border bg-subtle px-1.5 py-0.5 text-[11px] font-mono text-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-secondary">
              No matching pages or records for "{query}".
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setQuery('');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-subtle transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-subtle border border-border">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {item.category} • {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
