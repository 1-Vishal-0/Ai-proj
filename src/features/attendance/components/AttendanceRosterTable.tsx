import React from 'react';
import { Check, X, Users } from 'lucide-react';
import type {
  AttendanceRosterEntry,
  AttendanceStatus,
  EnrichedStudent,
} from '../../../types';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { cn } from '../../../lib/cn';

interface AttendanceRosterTableProps {
  students: EnrichedStudent[];
  rosterMap: Record<string, AttendanceRosterEntry>;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onRemarkChange?: (studentId: string, remarks: string) => void;
  getStudentHistoricalStats?: (studentId: string) => {
    percentage: number;
    present: number;
    totalSessions: number;
  };
  compact?: boolean;
  emptyMessage?: string;
}

const StatusSegmentedControl: React.FC<{
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  compact?: boolean;
}> = ({ status, onChange, compact }) => {
  return (
    <div
      role="group"
      aria-label="Attendance status"
      className="inline-flex rounded-lg border border-border bg-subtle p-0.5 gap-0.5"
    >
      <button
        type="button"
        onClick={() => onChange('present')}
        className={cn(
          'rounded font-medium transition-colors inline-flex items-center gap-1',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1 text-xs',
          status === 'present'
            ? 'bg-green-600 text-white font-semibold'
            : 'text-secondary hover:text-primary'
        )}
      >
        <Check className="w-3 h-3" />
        <span>Present</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('absent')}
        className={cn(
          'rounded font-medium transition-colors inline-flex items-center gap-1',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1 text-xs',
          status === 'absent'
            ? 'bg-red-600 text-white font-semibold'
            : 'text-secondary hover:text-primary'
        )}
      >
        <X className="w-3 h-3" />
        <span>Absent</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('leave')}
        className={cn(
          'rounded font-medium transition-colors',
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1 text-xs',
          status === 'leave'
            ? 'bg-amber-600 text-white font-semibold'
            : 'text-secondary hover:text-primary'
        )}
      >
        Leave
      </button>
    </div>
  );
};

export const AttendanceRosterTable: React.FC<AttendanceRosterTableProps> = ({
  students,
  rosterMap,
  onStatusChange,
  onRemarkChange,
  getStudentHistoricalStats,
  compact = false,
  emptyMessage = 'No students currently enrolled in this class.',
}) => {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="Empty Roster"
          description={emptyMessage}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-surface">
        <table className="w-full text-left text-xs">
          <thead className="bg-subtle text-secondary uppercase text-[10px] tracking-wider border-b border-border sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-3 font-medium">USN / Roll</th>
              <th className="py-2.5 px-3 font-medium">Student</th>
              <th className="py-2.5 px-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const currentStatus = rosterMap[s.id]?.status || 'present';
              return (
                <tr
                  key={s.id}
                  className={cn(
                    'hover:bg-subtle/50 transition-colors',
                    currentStatus === 'absent' && 'bg-rose-50/40 dark:bg-rose-500/5'
                  )}
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-primary tabular-nums">
                    {s.roll_number}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-primary">
                    {s.user.name}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <StatusSegmentedControl
                      compact
                      status={currentStatus}
                      onChange={(next) => onStatusChange(s.id, next)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Responsive Roster Cards (< md) */}
      <div className="divide-y divide-border md:hidden">
        {students.map((student, idx) => {
          const currentStatus = rosterMap[student.id]?.status || 'present';
          const currentRemark = rosterMap[student.id]?.remarks || '';
          const stats = getStudentHistoricalStats?.(student.id);

          return (
            <div
              key={student.id}
              className={cn(
                'p-4 space-y-3',
                currentStatus === 'absent' && 'bg-rose-50/30 dark:bg-rose-500/5'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono text-muted w-5">
                    {idx + 1}.
                  </span>
                  <Avatar
                    src={student.user.avatar_url}
                    name={student.user.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">
                      {student.user.name}
                    </p>
                    <p className="font-mono text-[11px] text-brand-600 dark:text-brand-400">
                      {student.roll_number}
                    </p>
                  </div>
                </div>
                {stats && (
                  <span
                    className={cn(
                      'text-xs font-mono font-semibold tabular-nums shrink-0',
                      stats.percentage < 75
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {stats.percentage}%
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <StatusSegmentedControl
                  compact
                  status={currentStatus}
                  onChange={(next) => onStatusChange(student.id, next)}
                />
              </div>

              {onRemarkChange && (
                <input
                  type="text"
                  placeholder="Optional remark..."
                  value={currentRemark}
                  onChange={(e) => onRemarkChange(student.id, e.target.value)}
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-border bg-canvas/50 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Roster Table (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-subtle/70 text-secondary uppercase tracking-wider text-[11px] border-b border-border sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 w-12 text-center font-medium">#</th>
              <th className="py-3 px-4 font-medium">Student &amp; USN</th>
              {getStudentHistoricalStats && (
                <th className="py-3 px-4 font-medium">Standing</th>
              )}
              <th className="py-3 px-4 text-center font-medium">Status</th>
              {onRemarkChange && <th className="py-3 px-4 font-medium">Remarks</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student, idx) => {
              const currentStatus = rosterMap[student.id]?.status || 'present';
              const currentRemark = rosterMap[student.id]?.remarks || '';
              const studentStats = getStudentHistoricalStats?.(student.id);

              return (
                <tr
                  key={student.id}
                  className={cn(
                    'hover:bg-subtle/50 transition-colors',
                    currentStatus === 'absent' && 'bg-rose-50/30 dark:bg-rose-500/5'
                  )}
                >
                  <td className="py-3 px-4 text-center font-mono text-muted tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={student.user.avatar_url}
                        name={student.user.name}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-primary">
                          {student.user.name}
                        </p>
                        <p className="font-mono text-[11px] text-brand-600 dark:text-brand-400">
                          {student.roll_number}
                        </p>
                      </div>
                    </div>
                  </td>
                  {studentStats && (
                    <td className="py-3 px-4 tabular-nums">
                      <span
                        className={cn(
                          'font-semibold font-mono',
                          studentStats.percentage < 75
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {studentStats.percentage}%
                      </span>
                      <span className="text-[11px] text-muted ml-1.5 font-mono">
                        ({studentStats.present}/{studentStats.totalSessions})
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <StatusSegmentedControl
                      status={currentStatus}
                      onChange={(next) => onStatusChange(student.id, next)}
                    />
                  </td>
                  {onRemarkChange && (
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Add note (e.g. late, medical)..."
                        value={currentRemark}
                        onChange={(e) =>
                          onRemarkChange(student.id, e.target.value)
                        }
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-border bg-canvas/50 text-primary placeholder:text-muted focus:bg-surface focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
