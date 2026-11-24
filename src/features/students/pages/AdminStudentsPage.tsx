import { Link } from 'react-router-dom';
import { demoMode } from '../../../services/supabaseClient';
import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { EnrichedStudent } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { studentsService } from '../../../services/students.service';
import { academicsService } from '../../../services/academics.service';
import { attendanceService } from '../../../services/attendance.service';
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
  Select,
  type DataColumn,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const AdminStudentsPage: React.FC = () => {
  useDatabaseVersion();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [accountStatus, setAccountStatus] = useState('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedScheme, setSelectedScheme] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsn, setFormUsn] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formProgramme, setFormProgramme] = useState('');
  const [formScheme, setFormScheme] = useState('');
  const [formAdmissionYear, setFormAdmissionYear] = useState(2022);
  const [formBatch, setFormBatch] = useState('2022-2026');
  const [formSemester, setFormSemester] = useState(5);
  const [formSection, setFormSection] = useState('A');
  const [formGuardianEmail, setFormGuardianEmail] = useState('');
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const students = studentsService.getEnrichedStudents();
  const departments = academicsService.getDepartments();
  const classes = academicsService.getClasses();
  const programmes = academicsService.getProgrammes();
  const schemes = academicsService.getSchemes();
  const settings = settingsService.getSettings();

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;
    const matchesDept =
      selectedDept === 'all' || s.department_id === selectedDept;
    const matchesScheme =
      selectedScheme === 'all' || s.vtu_scheme_id === selectedScheme;

    const status = s.user.archived_at ? 'archived' : s.user.enabled === false ? 'inactive' : 'active';
    return (accountStatus === 'all' || accountStatus === status) && matchesSearch && matchesClass && matchesDept && matchesScheme;
  });

  const handleDepartmentChange = (deptId: string) => {
    setFormDept(deptId);
    const matchingProg = programmes.find((p) => p.department_id === deptId);
    if (matchingProg) setFormProgramme(matchingProg.id);
    const matchingClasses = classes.filter((c) => c.department_id === deptId);
    if (matchingClasses.length > 0) {
      const firstClass = matchingClasses[0];
      setFormClass(firstClass.id);
      setFormSemester(firstClass.semester);
      setFormSection(firstClass.section);
      setFormBatch(firstClass.admission_batch);
    }
  };

  const handleClassChange = (classId: string) => {
    setFormClass(classId);
    const selected = classes.find((c) => c.id === classId);
    if (selected) {
      setFormSemester(selected.semester);
      setFormSection(selected.section);
      setFormBatch(selected.admission_batch);
    }
  };

  const handleOpenAdd = () => {
    const defaultDept = departments[0]?.id || 'dept-cse';
    const deptClasses = classes.filter((c) => c.department_id === defaultDept);
    const firstClass = deptClasses[0] || classes[0];

    setFormName('');
    setFormEmail('');
    setFormUsn(`ENG22CS${String(students.length + 90).padStart(3, '0')}`);
    setFormDept(defaultDept);
    setFormProgramme(programmes[0]?.id || 'prog-cse');
    setFormScheme(
      schemes[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSchemeId
    );
    setFormClass(
      firstClass?.id || INSTITUTION_CONFIG.academicDefaults.defaultClassId
    );
    setFormAdmissionYear(2022);
    setFormBatch(firstClass?.admission_batch || '2022-2026');
    setFormSemester(firstClass?.semester || 5);
    setFormSection(firstClass?.section || 'A');
    setFormGuardianEmail('');
    setFormGuardianPhone('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const enrolled = studentsService.enrollStudent(
        {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formGuardianPhone,
        },
        {
          usn: formUsn.trim().toUpperCase(),
          roll_number: formUsn.trim().toUpperCase(),
          class_id: formClass,
          department_id: formDept,
          programme_id: formProgramme || programmes[0]?.id,
          vtu_scheme_id: formScheme || schemes[0]?.id,
          admission_year: Number(formAdmissionYear),
          admission_batch: formBatch.trim(),
          current_semester: Number(formSemester),
          section: formSection.trim().toUpperCase(),
          guardian_email: formGuardianEmail.trim(),
          guardian_phone: formGuardianPhone.trim(),
        },
        currentUser?.id
      );

      setIsAddModalOpen(false);
      toast({
        variant: 'success',
        title: 'Student enrolled',
        description: `${enrolled.user.name} (${enrolled.usn}) added to ${enrolled.academic_class?.name}.`,
      });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to enroll student.'
      );
    }
  };

  const columns: DataColumn<EnrichedStudent>[] = [
    {
      key: 'student',
      header: 'Student',
      sortValue: (s) => s.user.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar src={s.user.avatar_url} name={s.user.name} size="sm" />
          <div>
            <p className="font-medium text-primary"><Link className="text-brand-700 hover:underline" to={`/admin/students/${s.id}`}>{s.user.name}</Link></p>
            <p className="text-[11px] text-muted font-mono">{s.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'usn',
      header: 'USN / Roll',
      sortValue: (s) => s.usn,
      render: (s) => (
        <span className="font-mono font-semibold text-brand-600">
          {s.usn}
        </span>
      ),
    },
    {
      key: 'class',
      header: 'Class & Scheme',
      sortValue: (s) => s.academic_class?.name || s.class_id,
      render: (s) => (
        <div>
          <p className="font-medium text-primary">
            {s.academic_class?.name || s.class_id}
          </p>
          <p className="text-[11px] text-secondary">
            {s.vtu_scheme?.name || '2022 Regulation'} • {s.admission_batch}
          </p>
        </div>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      sortValue: (s) => attendanceService.calculateStudentAttendance(s.id).percentage,
      render: (s) => {
        const stats = attendanceService.calculateStudentAttendance(s.id);
        return (
          <div className="w-36 space-y-1.5 tabular-nums">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-primary">
                {stats.percentage}%
              </span>
              <span className="text-[11px] text-muted font-mono">
                {stats.present}/{stats.totalSessions}
              </span>
            </div>
            <ProgressBar
              value={stats.percentage}
              threshold={settings.threshold_percentage}
              warningThreshold={settings.warning_threshold}
            />
          </div>
        );
      },
    },
    {
      key: 'guardian',
      header: 'Guardian Contact',
      render: (s) => (
        <div className="text-[11px] text-secondary">
          <p className="truncate">{s.guardian_email || '—'}</p>
          <p className="font-mono text-muted">{s.guardian_phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Standing',
      align: 'right',
      render: (s) => {
        const stats = attendanceService.calculateStudentAttendance(s.id);
        const isLow = stats.percentage < settings.threshold_percentage;
        return isLow ? (
          <Badge variant="danger" dot>
            Shortage
          </Badge>
        ) : (
          <Badge variant="success" dot>
            Eligible
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Directory"
        description={`${students.length} enrolled students across active programmes and class sections`}
        actions={
          demoMode ? (<Button
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Enroll Student
          </Button>) : <Link to="/admin/register" className="text-sm font-semibold text-brand-700">Register or import people</Link>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by student name, USN (ENG22CS089) or email..."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
          <Select
            value={selectedScheme}
            onChange={(e) => setSelectedScheme(e.target.value)}
            aria-label="Filter by scheme"
          >
            <option value="all">All Schemes</option>
            {schemes.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </Select>
          <Select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Filter by class"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Select aria-label="Account status" value={accountStatus} onChange={e => setAccountStatus(e.target.value)}>
          <option value="all">All account statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
      </FilterBar>

      <DataTable
        data={filteredStudents}
        columns={columns}
        keyExtractor={(s) => s.id}
        pageSize={10}
        stickyHeader
        selectable
        renderMobileCard={(s) => {
          const stats = attendanceService.calculateStudentAttendance(s.id);
          const isLow = stats.percentage < settings.threshold_percentage;
          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={s.user.avatar_url} name={s.user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">
                      <Link className="text-brand-700 hover:underline" to={`/admin/students/${s.id}`}>{s.user.name}</Link>
                    </p>
                    <p className="font-mono text-[11px] text-brand-600">
                      {s.usn}
                    </p>
                  </div>
                </div>
                <Badge variant={isLow ? 'danger' : 'success'} dot>
                  {stats.percentage}%
                </Badge>
              </div>
              <ProgressBar
                value={stats.percentage}
                threshold={settings.threshold_percentage}
              />
              <p className="text-[11px] text-secondary">
                {s.academic_class?.name} • {stats.present}/{stats.totalSessions} attended
              </p>
            </div>
          );
        }}
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll Student"
        description="Create student credentials and link to an academic class batch"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Full Name"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Varun Kumar"
            />
            <Input
              label="Institutional Email"
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="varun.k@portal.edu"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="USN / Roll Number"
              required
              value={formUsn}
              onChange={(e) => setFormUsn(e.target.value.toUpperCase())}
              placeholder="ENG22CS090"
              className="font-mono"
            />
            <Input
              label="Admission Batch"
              required
              value={formBatch}
              onChange={(e) => setFormBatch(e.target.value)}
              placeholder="2022-2026"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Select
              label="Academic Scheme"
              value={formScheme}
              onChange={(e) => setFormScheme(e.target.value)}
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Department"
              value={formDept}
              onChange={(e) => handleDepartmentChange(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Target Class"
              value={formClass}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              {(() => {
                const filtered = classes.filter(
                  (c) => c.department_id === formDept
                );
                const available = filtered.length > 0 ? filtered : classes;
                return available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ));
              })()}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Guardian Email"
              type="email"
              value={formGuardianEmail}
              onChange={(e) => setFormGuardianEmail(e.target.value)}
              placeholder="parent@example.com"
            />
            <Input
              label="Guardian Phone"
              type="tel"
              value={formGuardianPhone}
              onChange={(e) => setFormGuardianPhone(e.target.value)}
              placeholder="+91 94480 00000"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Enroll Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
