import React from 'react';
import { Edit2 } from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  EnrichedStudent,
} from '../../../types';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';

interface SessionRosterModalProps {
  session: AttendanceSession | null;
  classNameLabel?: string;
  subjectNameLabel?: string;
  records: (AttendanceRecord & { student?: EnrichedStudent })[];
  onClose: () => void;
  onEditRecord?: (record: AttendanceRecord) => void;
  showSummaryBadges?: boolean;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  leave: 'On leave',
};

export const SessionRosterModal: React.FC<SessionRosterModalProps> = ({
  session,
  classNameLabel,
  subjectNameLabel,
  records,
  onClose,
  onEditRecord,
  showSummaryBadges = true,
}) => {
  if (!session) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Session roster • ${session.date}`}
      description={`${classNameLabel || session.class_id} — ${
        subjectNameLabel || session.subject_id
      }`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {showSummaryBadges ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-subtle p-3 rounded-md border border-border">
            <span className="text-secondary">
              Recorded:{' '}
              <strong className="text-primary tabular-nums">
                {records.length}
              </strong>{' '}
              students
            </span>
            <div className="flex gap-1.5">
              <Badge variant="success">
                {records.filter((r) => r.status === 'present').length} Present
              </Badge>
              <Badge variant="danger">
                {records.filter((r) => r.status === 'absent').length} Absent
              </Badge>
              <Badge variant="warning">
                {records.filter((r) => r.status === 'leave').length} On leave
              </Badge>
            </div>
          </div>
        ) : (
          <div className="text-xs text-secondary bg-subtle p-3 rounded-md border border-border">
            Select the edit button on any student row to record an authorized attendance correction.
          </div>
        )}

        <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-md">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-3 flex items-center justify-between gap-3 hover:bg-subtle/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={rec.student?.user.avatar_url}
                  name={rec.student?.user.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {rec.student?.user.name}
                  </p>
                  <p className="text-xs text-secondary tabular-nums">
                    {rec.student?.roll_number} • {rec.marked_by}
                  </p>
                  {rec.remarks && (
                    <p className="text-xs text-secondary truncate mt-0.5">
                      {rec.remarks}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    rec.status === 'present'
                      ? 'success'
                      : rec.status === 'absent'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {STATUS_LABEL[rec.status]}
                </Badge>
                {onEditRecord && (
                  <button
                    type="button"
                    onClick={() => onEditRecord(rec)}
                    aria-label={`Edit attendance for ${rec.student?.user.name || 'student'}`}
                    className="p-1.5 rounded text-muted hover:text-brand-600 hover:bg-subtle transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
