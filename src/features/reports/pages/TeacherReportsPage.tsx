import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { facultyService } from '../../../services/faculty.service';
import {
  reportsService,
  type CourseReportRow,
} from '../../../services/reports.service';
import { settingsService } from '../../../services/settings.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  type DataColumn,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const TeacherReportsPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const { currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;
  const settings = settingsService.getSettings();
  const threshold = settings.threshold_percentage;

  const { classes, subjects } =
    facultyService.getAssignedClassesAndSubjects(teacherId);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultClassId
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSubjectId
  );
  const [searchQuery, setSearchQuery] = useState('');

  const reportData = reportsService.getCourseReportRows(
    selectedClassId,
    selectedSubjectId
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportData;
    return reportData.filter(
      (row) =>
        row.name.toLowerCase().includes(q) || row.roll.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const handleExportCSV = () => {
    reportsService.exportCourseReportCSV(selectedClassId, selectedSubjectId);
    toast({
      variant: 'success',
      title: 'Course report exported',
      description: 'CSV spreadsheet downloaded for the selected section and course.',
    });
  };

  const columns = useMemo<DataColumn<CourseReportRow>[]>(
    () => [
      {
        key: 'roll',
        header: 'USN / Roll',
        sortValue: (row) => row.roll,
        render: (row) => (
          <span className="font-mono font-semibold text-primary tabular-nums">
            {row.roll}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Student Name',
        sortValue: (row) => row.name,
        render: (row) => <span className="font-medium text-primary">{row.name}</span>,
      },
      {
        key: 'total',
        header: 'Conducted',
        align: 'center',
        sortValue: (row) => row.total,
        render: (row) => (
          <span className="font-mono text-secondary tabular-nums">
            {row.total}
          </span>
        ),
      },
      {
        key: 'present',
        header: 'Attended',
        align: 'center',
        sortValue: (row) => row.present,
        render: (row) => (
          <span className="font-mono font-semibold text-emerald-600 tabular-nums">
            {row.present}
          </span>
        ),
      },
      {
        key: 'absent',
        header: 'Absent',
        align: 'center',
        sortValue: (row) => row.absent,
        render: (row) => (
          <span className="font-mono font-semibold text-rose-600 tabular-nums">
            {row.absent}
          </span>
        ),
      },
      {
        key: 'leave',
        header: 'On Leave',
        align: 'center',
        sortValue: (row) => row.leave,
        render: (row) => (
          <span className="font-mono text-amber-600 tabular-nums">
            {row.leave}
          </span>
        ),
      },
      {
        key: 'percentage',
        header: 'Attendance Rate',
        sortValue: (row) => row.percentage,
        render: (row) => (
          <div className="w-32 space-y-1">
            <span
              className={`font-mono font-semibold tabular-nums ${
                row.percentage < threshold
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {row.percentage}%
            </span>
            <ProgressBar
              value={row.percentage}
              threshold={threshold}
              warningThreshold={settings.warning_threshold}
              size="xs"
            />
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Eligibility',
        align: 'right',
        sortValue: (row) => row.percentage,
        render: (row) => (
          <Badge variant={row.percentage < threshold ? 'danger' : 'success'} dot>
            {row.status}
          </Badge>
        ),
      },
    ],
    [threshold, settings.warning_threshold]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Attendance Reports"
        description="Generate printable grade-book sheets and export official CSV attendance summaries"
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Print Sheet
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <FilterBar>
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="w-full sm:w-52">
            <Select
              label="Target Section"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-full sm:w-72">
            <Select
              label="Course Subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter student name or USN..."
          className="sm:max-w-xs"
        />
      </FilterBar>

      <DataTable
        data={filteredRows}
        columns={columns}
        keyExtractor={(row) => row.roll}
        pageSize={15}
        stickyHeader
        emptyTitle="No student report records"
        emptyDescription="Select an assigned section and course subject to view grade-book standing."
        renderMobileCard={(row) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-primary">{row.name}</p>
                <p className="text-[11px] font-mono text-brand-600">
                  {row.roll}
                </p>
              </div>
              <Badge variant={row.percentage < threshold ? 'danger' : 'success'} dot>
                {row.percentage}% • {row.status}
              </Badge>
            </div>
            <ProgressBar
              value={row.percentage}
              threshold={threshold}
              warningThreshold={settings.warning_threshold}
              size="xs"
            />
            <div className="flex items-center justify-between text-[11px] text-secondary font-mono">
              <span>Conducted: {row.total}</span>
              <span className="text-emerald-600">
                Present: {row.present}
              </span>
              <span className="text-rose-600">
                Absent: {row.absent}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
};
