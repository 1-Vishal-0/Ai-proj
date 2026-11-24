import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Mail,
  Send,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import type { EnrichedStudent } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { facultyService } from '../../../services/faculty.service';
import { analyticsService } from '../../../services/analytics.service';
import { settingsService } from '../../../services/settings.service';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatCard,
  Textarea,
  type DataColumn,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

interface FlaggedStudentRow {
  student: EnrichedStudent;
  overallPercentage: number;
  attended: number;
  totalClasses: number;
  declining: boolean;
}

export const TeacherLowAttendancePage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const { currentUser, currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;
  const settings = settingsService.getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);
  const [advisorySubject, setAdvisorySubject] = useState('');
  const [advisoryMessage, setAdvisoryMessage] = useState('');

  const { assignedClassIds } = facultyService.getAssignedClassesAndSubjects(teacherId);
  const lowStudents = analyticsService
    .getLowAttendanceStudents(settings.threshold_percentage)
    .filter((item) => assignedClassIds.has(item.student.class_id));

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return lowStudents;
    return lowStudents.filter(
      (item) =>
        item.student.user.name.toLowerCase().includes(q) ||
        item.student.roll_number.toLowerCase().includes(q) ||
        (item.student.academic_class?.name || '').toLowerCase().includes(q)
    );
  }, [lowStudents, searchQuery]);

  const handleOpenAlert = (student: EnrichedStudent, pct: number) => {
    setSelectedStudent(student);
    setAdvisorySubject(
      `Academic Warning: Low Attendance Notice for ${student.user.name}`
    );
    setAdvisoryMessage(
      `Dear ${student.user.name},\n\nThis is an official academic notice from ${currentUser?.name} at ${settings.institution_name}.\n\nYour recorded attendance is ${pct}%, which is below the mandatory ${settings.threshold_percentage}% institutional requirement for final examination eligibility.\n\nPlease attend upcoming classes and contact your department office to discuss your attendance.\n\nRegards,\n${currentUser?.name}\n${currentTeacher?.department?.name || 'Faculty Office'}`
    );
  };

  const handleSendAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !currentUser) return;

    try {
      await analyticsService.dispatchLowAttendanceAdvisory(selectedStudent, advisorySubject, advisoryMessage, currentUser);
      toast({ variant: 'success', title: 'Advisory sent', description: 'The student can read it in their portal.' });
      setSelectedStudent(null);
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to send advisory', description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns: DataColumn<FlaggedStudentRow>[] = [
    {
      key: 'student',
      header: 'Student & USN',
      sortValue: (row) => row.student.user.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={row.student.user.avatar_url}
            name={row.student.user.name}
            size="sm"
          />
          <div>
            <p className="font-medium text-primary">{row.student.user.name}</p>
            <p className="text-[11px] font-mono text-brand-600">
              {row.student.roll_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Section & Guardian',
      sortValue: (row) => row.student.academic_class?.name || '',
      render: (row) => (
        <div>
          <p className="font-medium text-primary">
            {row.student.academic_class?.name}
          </p>
          <p className="text-[11px] text-muted">
            {row.student.guardian_email || 'No email'} •{' '}
            {row.student.guardian_phone || 'N/A'}
          </p>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Signal',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.overallPercentage < 60 ? (
            <Badge variant="danger" dot>
              Critical (&lt;60%)
            </Badge>
          ) : (
            <Badge variant="warning" dot>
              Below {settings.threshold_percentage}%
            </Badge>
          )}
          {row.declining && (
            <Badge variant="danger">
              <TrendingDown className="w-3 h-3 mr-1" />
              Declining
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'attendance',
      header: 'Standing',
      sortValue: (row) => row.overallPercentage,
      render: (row) => (
        <div className="w-36 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="font-semibold text-rose-600">
              {row.overallPercentage}%
            </span>
            <span className="text-[11px] text-muted">
              {row.attended}/{row.totalClasses}
            </span>
          </div>
          <ProgressBar
            value={row.overallPercentage}
            threshold={settings.threshold_percentage}
            warningThreshold={settings.warning_threshold}
            size="xs"
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Advisory',
      align: 'right',
      render: (row) => (
        <Button
          variant="danger"
          size="xs"
          leftIcon={<Mail className="w-3.5 h-3.5" />}
          onClick={() => handleOpenAlert(row.student, row.overallPercentage)}
        >
          Send Warning
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Low Attendance Watchlist"
        badge={
          <Badge variant="danger" dot>
            Threshold: {settings.threshold_percentage}%
          </Badge>
        }
        description={`Identify students below the ${settings.threshold_percentage}% requirement and dispatch formal academic advisories`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Below Threshold"
          value={lowStudents.length}
          tone={lowStudents.length > 0 ? 'danger' : 'success'}
          sublabel={`Under ${settings.threshold_percentage}% requirement`}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label="Declining Attendance"
          value={lowStudents.filter((s) => s.declining).length}
          tone="warning"
          sublabel="Missed 2+ consecutive lectures"
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <StatCard
          label="Exam Debarment Risk"
          value={lowStudents.filter((s) => s.overallPercentage < 60).length}
          tone="danger"
          sublabel="Critically low standing (<60%)"
          icon={<ShieldAlert className="w-4 h-4" />}
        />
      </div>

      {lowStudents.length > 0 && (
        <FilterBar>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search flagged students by name, USN, or section..."
            className="md:max-w-sm"
          />
          <span className="text-xs text-secondary tabular-nums">
            Showing <strong className="text-primary">{filteredStudents.length}</strong>{' '}
            flagged student(s)
          </span>
        </FilterBar>
      )}

      <DataTable
        data={filteredStudents}
        columns={columns}
        keyExtractor={(row) => row.student.id}
        emptyTitle="No students flagged for low attendance"
        emptyDescription={`All students in your assigned classes currently satisfy the ${settings.threshold_percentage}% attendance requirement.`}
        renderMobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  src={row.student.user.avatar_url}
                  name={row.student.user.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">
                    {row.student.user.name}
                  </p>
                  <p className="text-[11px] font-mono text-brand-600">
                    {row.student.roll_number} • {row.student.academic_class?.name}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-semibold text-rose-600 tabular-nums">
                {row.overallPercentage}%
              </span>
            </div>
            <ProgressBar
              value={row.overallPercentage}
              threshold={settings.threshold_percentage}
              warningThreshold={settings.warning_threshold}
              size="xs"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted font-mono">
                Attended {row.attended}/{row.totalClasses}
              </span>
              <Button
                variant="danger"
                size="xs"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
                onClick={() => handleOpenAlert(row.student, row.overallPercentage)}
              >
                Send Warning
              </Button>
            </div>
          </div>
        )}
      />

      {selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudent(null)}
          title={`Dispatch Formal Advisory: ${selectedStudent.user.name}`}
          description="The student will receive this message in their portal."
          maxWidth="lg"
        >
          <form onSubmit={handleSendAdvisory} className="space-y-4">
            <Input
              label="Advisory subject"
              maxLength={200}
              required
              value={advisorySubject}
              onChange={(e) => setAdvisorySubject(e.target.value)}
            />

            <Textarea
              label="Notice Body & Action Plan"
              required
              rows={8}
              maxLength={4000}
              value={advisoryMessage}
              onChange={(e) => setAdvisoryMessage(e.target.value)}
            />

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedStudent(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Official Advisory
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
