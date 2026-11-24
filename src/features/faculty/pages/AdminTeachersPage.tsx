import { Link } from 'react-router-dom';
import { demoMode } from '../../../services/supabaseClient';
import React, { useState } from 'react';
import { UserPlus, Plus, GraduationCap } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { facultyService } from '../../../services/faculty.service';
import { academicsService } from '../../../services/academics.service';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
} from '../../../components/ui';

const DESIGNATION_OPTIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Professor & HOD',
  'Dean / Director',
  'Senior Lecturer',
  'Lecturer',
  'Visiting Faculty / Adjunct Professor',
  'Lab Instructor / Technical Assistant',
  'Other',
];

const QUALIFICATION_OPTIONS = [
  'Ph.D.',
  'Ph.D. (Pursuing)',
  'M.Tech / M.E.',
  'M.S. / M.Sc.',
  'B.Tech / B.E.',
  'MCA / MBA',
  'Other',
];

export const AdminTeachersPage: React.FC = () => {
  useDatabaseVersion();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [accountStatus, setAccountStatus] = useState('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedDesignation, setSelectedDesignation] =
    useState('Assistant Professor');
  const [customDesignation, setCustomDesignation] = useState('');
  const [selectedQualification, setSelectedQualification] =
    useState('M.Tech / M.E.');
  const [customQualification, setCustomQualification] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignClassId, setAssignClassId] = useState('');


  const teachers = facultyService.getEnrichedTeachers();
  const departments = academicsService.getDepartments();
  const classes = academicsService.getClasses();
  const subjects = academicsService.getSubjects();
  const assignments = facultyService.getAssignments();
  const selectedClass = classes.find(c => c.id === assignClassId);
  const availableSubjects = selectedClass ? academicsService.getSectionSubjects(selectedClass).filter(subject =>
    !assignments.some(a => a.teacher_id === selectedTeacherId && a.class_id === selectedClass.id && a.subject_id === subject.id)
  ) : [];
  const selectedSubject = availableSubjects.find(subject=>subject.id === assignSubjectId) || availableSubjects[0];

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      selectedDept === 'all' || t.department_id === selectedDept;
    const status = t.user.archived_at ? 'archived' : t.user.enabled === false ? 'inactive' : 'active';
    return (accountStatus === 'all' || accountStatus === status) && matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setEmployeeId(`EMP-CSE-${100 + teachers.length + 1}`);
    setDepartmentId(departments[0]?.id || '');
    setSelectedDesignation('Assistant Professor');
    setCustomDesignation('');
    setSelectedQualification('M.Tech / M.E.');
    setCustomQualification('');
    setFormError(null);
    setIsAddTeacherOpen(true);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalDesignation =
      selectedDesignation === 'Other'
        ? customDesignation.trim()
        : selectedDesignation;
    const finalQualification =
      selectedQualification === 'Other'
        ? customQualification.trim()
        : selectedQualification;

    if (!finalDesignation || !finalQualification) {
      setFormError('Please specify both faculty designation and qualification.');
      return;
    }

    try {
      const created = facultyService.createTeacher(
        {
          name: name.trim(),
          email: email.trim(),
        },
        {
          employee_id: employeeId.trim(),
          department_id: departmentId,
          designation: finalDesignation,
          qualification: finalQualification,
        },
        currentUser?.id
      );
      setIsAddTeacherOpen(false);
      toast({
        variant: 'success',
        title: 'Faculty profile created',
        description: `${created.user.name} (${created.employee_id}) added.`,
      });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create teacher'
      );
    }
  };

  const handleOpenAssign = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setAssignSubjectId('');
    setAssignClassId(classes[0]?.id || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await facultyService.assignTeacher(
        {
          teacher_id: selectedTeacherId,
          subject_id: selectedSubject?.id ?? '',
          class_id: assignClassId,
          academic_year: classes.find((entry) => entry.id === assignClassId)?.academic_year ?? '',
        },
        currentUser?.id
      );
      setIsAssignModalOpen(false);
      toast({
        variant: 'success',
        title: 'Course assigned',
        description: 'Teaching workload allocation updated.',
      });
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Unable to assign course.',
      });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faculty & Workload"
        description={`${teachers.length} faculty members across academic departments`}
        actions={
          demoMode ? (<Button
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Add Faculty
          </Button>) : <Link to="/admin/register" className="text-sm font-semibold text-brand-700">Register or import people</Link>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search faculty by name, employee ID or email..."
        />
        <div className="w-full md:w-56">
          <Select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
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

      {filteredTeachers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="w-5 h-5" />}
            title="No matching faculty profiles"
            description="Adjust your search query or department filter."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => {
            const teacherAssignments = assignments.filter(
              (a) => a.teacher_id === teacher.id
            );

            return (
              <Card
                key={teacher.id}
                className="p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={teacher.user.avatar_url}
                        name={teacher.user.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-primary truncate">
                          <Link className="text-brand-700 hover:underline" to={`/admin/teachers/${teacher.id}`}>{teacher.user.name}</Link>
                        </h3>
                        <p className="text-xs text-secondary truncate">
                          {teacher.designation}
                        </p>
                      </div>
                    </div>
                    <Badge variant="primary">
                      {teacher.department?.code || 'DEPT'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Employee ID</span>
                      <span className="font-mono font-medium text-primary">
                        {teacher.employee_id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Email</span>
                      <span className="font-mono text-[11px] text-secondary truncate">
                        {teacher.user.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Qualification</span>
                      <span className="text-secondary truncate">
                        {teacher.qualification || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted">
                        Courses ({teacherAssignments.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAssign(teacher.id)}
                        className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Assign
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {teacherAssignments.length === 0 ? (
                        <p className="text-xs text-muted py-1">
                          No courses allocated yet.
                        </p>
                      ) : (
                        teacherAssignments.map((assign) => {
                          const sub = subjects.find(
                            (s) => s.id === assign.subject_id
                          );
                          const cls = classes.find(
                            (c) => c.id === assign.class_id
                          );
                          return (
                            <div
                              key={assign.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-subtle/60 border border-border text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-primary truncate">
                                  <span className="font-mono text-brand-600">
                                    {sub?.code}
                                  </span>{' '}
                                  • {sub?.name}
                                </p>
                                <p className="text-[11px] text-muted">
                                  {cls?.name} • {assign.academic_year}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted tabular-nums">
                    {teacherAssignments.length} active allocation(s)
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleOpenAssign(teacher.id)}
                  >
                    Allocate Course
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
        title="Add Faculty Member"
        description="Register faculty profile, designation and department"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}
          <Input
            label="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Rajesh Khanna"
          />
          <Input
            label="Faculty Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rajesh.khanna@portal.edu"
          />
          <div className="grid grid-cols-2 gap-3.5">
            <Input
              label="Employee ID"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-CSE-105"
              className="font-mono"
            />
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-2">
              <Select
                label="Designation"
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
              >
                {DESIGNATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
              {selectedDesignation === 'Other' && (
                <Input
                  required
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  placeholder="Specify designation..."
                />
              )}
            </div>

            <div className="space-y-2">
              <Select
                label="Qualification"
                value={selectedQualification}
                onChange={(e) => setSelectedQualification(e.target.value)}
              >
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
              {selectedQualification === 'Other' && (
                <Input
                  required
                  value={customQualification}
                  onChange={(e) => setCustomQualification(e.target.value)}
                  placeholder="Specify qualification..."
                />
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddTeacherOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Faculty</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Allocate Course to Faculty"
        description="Link a course subject and class batch for the academic year"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <Select
            label="Target Class"
            value={assignClassId}
            onChange={(e) => {setAssignClassId(e.target.value); setAssignSubjectId('');}}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.academic_year}
              </option>
            ))}
          </Select>
          <Select
            label="Course Subject"
            value={selectedSubject?.id || ''}
            onChange={(e) => setAssignSubjectId(e.target.value)}
          >
            {!availableSubjects.length && <option value="">No available subjects for this section</option>}
            {availableSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} — {sub.name} ({sub.credits} Cr)
              </option>
            ))}
          </Select>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedSubject}>Assign Course</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
