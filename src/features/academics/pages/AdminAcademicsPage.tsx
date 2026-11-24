import React, { useState } from 'react';
import { BookOpen, Plus, Building2, GraduationCap } from 'lucide-react';
import type { AcademicClass, Department, Subject } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import { studentsService } from '../../../services/students.service';
import { facultyService } from '../../../services/faculty.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Tabs,
  Textarea,
  type DataColumn,
} from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { settingsService } from '../../../services/settings.service';

type AcademicsTab = 'departments' | 'classes' | 'subjects';

export const AdminAcademicsPage: React.FC = () => {
  useDatabaseVersion();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AcademicsTab>('departments');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [className, setClassName] = useState('');
  const [classProgramme, setClassProgramme] = useState('');
  const [classScheme, setClassScheme] = useState('');
  const [classSection, setClassSection] = useState('A');
  const [admissionBatch, setAdmissionBatch] = useState('');
  const [subjectScheme, setSubjectScheme] = useState('');
  const [subjectSemester, setSubjectSemester] = useState(1);
  const [classDeptId, setClassDeptId] = useState('');
  const [classSemester, setClassSemester] = useState(5);
  const [classYear, setClassYear] = useState<string>(
    settingsService.getSettings().current_academic_year
  );

  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDeptId, setSubDeptId] = useState('');
  const [subCredits, setSubCredits] = useState(3);

  const departments = academicsService.getDepartments();
  const programmes = academicsService.getProgrammes();
  const schemes = academicsService.getSchemes();
  const classes = academicsService.getClasses();
  const subjects = academicsService.getSubjects();
  const allStudents = studentsService.getStudents();
  const allTeachers = facultyService.getTeachers();

  const q = searchTerm.toLowerCase().trim();
  const filteredDepts = departments.filter(
    (d) =>
      !q ||
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q)
  );
  const filteredClasses = classes.filter(
    (c) => !q || c.name.toLowerCase().includes(q)
  );
  const filteredSubjects = subjects.filter(
    (s) =>
      !q ||
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await academicsService.createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        description: deptDesc.trim(),
        is_active: true,
      });
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      setIsDeptModalOpen(false);
      toast({
        variant: 'success',
        title: 'Department added',
        description: `${created.name} (${created.code}) registered.`,
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to save academic setup', description: err instanceof Error ? err.message : undefined });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await academicsService.createClass({
        name: className.trim(),
        department_id: classDeptId,
        programme_id: classProgramme,
        vtu_scheme_id: classScheme,
        semester: Number(classSemester),
        section: classSection.trim(),
        academic_year:
          classYear.trim() || settingsService.getSettings().current_academic_year,
        admission_batch: admissionBatch.trim(),
      });
      setClassName('');
      setIsClassModalOpen(false);
      toast({
        variant: 'success',
        title: 'Academic class created',
        description: `${created.name} added to Semester ${created.semester}.`,
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to save academic setup', description: err instanceof Error ? err.message : undefined });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanCode = subCode.trim().toUpperCase();
      const created = await academicsService.createSubject({
        code: cleanCode,
        name: subName.trim(),
        abbreviation: cleanCode,
        vtu_scheme_id: subjectScheme,
        department_id: subDeptId,
        semester: subjectSemester,
        category: 'PCC',
        course_type: 'theory',
        credits: Number(subCredits) || 4,
        teaching_hours: 40,
        cie_marks: 50,
        see_marks: 50,
        is_active: true,
      });
      setSubCode('');
      setSubName('');
      setIsSubjectModalOpen(false);
      toast({
        variant: 'success',
        title: 'Course registered',
        description: `${created.code} — ${created.name}`,
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to save academic setup', description: err instanceof Error ? err.message : undefined });
    }
  };

  const deptColumns: DataColumn<Department>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (d) => d.code,
      render: (d) => (
        <span className="font-mono font-semibold text-brand-600">
          {d.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Department',
      sortValue: (d) => d.name,
      render: (d) => <span className="font-medium text-primary">{d.name}</span>,
    },
    {
      key: 'description',
      header: 'Focus Area',
      render: (d) => (
        <span className="text-secondary max-w-sm truncate block">
          {d.description || '—'}
        </span>
      ),
    },
    {
      key: 'counts',
      header: 'Strength',
      align: 'right',
      render: (d) => {
        const sCount = allStudents.filter((s) => s.department_id === d.id).length;
        const tCount = allTeachers.filter((t) => t.department_id === d.id).length;
        return (
          <span className="text-secondary tabular-nums">
            <strong className="text-primary">{sCount}</strong> students •{' '}
            <strong className="text-primary">{tCount}</strong> faculty
          </span>
        );
      },
    },
  ];

  const classColumns: DataColumn<AcademicClass>[] = [
    {
      key: 'name',
      header: 'Class Batch',
      sortValue: (c) => c.name,
      render: (c) => <span className="font-medium text-primary">{c.name}</span>,
    },
    {
      key: 'dept',
      header: 'Department',
      render: (c) => {
        const dept = departments.find((d) => d.id === c.department_id);
        return <span className="text-secondary">{dept?.name || c.department_id}</span>;
      },
    },
    {
      key: 'semester',
      header: 'Semester',
      sortValue: (c) => c.semester,
      render: (c) => <Badge variant="neutral">Sem {c.semester}</Badge>,
    },
    {
      key: 'year',
      header: 'Academic Year',
      render: (c) => (
        <span className="font-mono text-secondary">{c.academic_year}</span>
      ),
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      align: 'right',
      sortValue: (c) => allStudents.filter((s) => s.class_id === c.id).length,
      render: (c) => {
        const enrolled = allStudents.filter((s) => s.class_id === c.id).length;
        return (
          <span className="font-mono font-semibold text-primary tabular-nums">
            {enrolled}
          </span>
        );
      },
    },
  ];

  const subjectColumns: DataColumn<Subject>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (s) => s.code,
      render: (s) => (
        <span className="font-mono font-semibold text-brand-600">
          {s.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Course Name',
      sortValue: (s) => s.name,
      render: (s) => <span className="font-medium text-primary">{s.name}</span>,
    },
    {
      key: 'dept',
      header: 'Department',
      render: (s) => {
        const dept = departments.find((d) => d.id === s.department_id);
        return <span className="text-secondary">{dept?.code || s.department_id}</span>;
      },
    },
    {
      key: 'credits',
      header: 'Credits',
      align: 'right',
      sortValue: (s) => s.credits,
      render: (s) => (
        <span className="font-mono font-semibold tabular-nums">
          {s.credits} Credits
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments & Classes"
        description="Manage engineering departments, semester class batches and foundational courses"
        actions={
          <>
            {activeTab === 'departments' && currentUser?.role === 'admin' && (
              <Button
                onClick={() => setIsDeptModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Department
              </Button>
            )}
            {activeTab === 'classes' && (
              <Button
                onClick={() => {
                  setClassDeptId(departments[0]?.id || '');
                  setClassProgramme('');
                  setClassScheme(schemes[0]?.id || '');
                  setIsClassModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Class
              </Button>
            )}
            {activeTab === 'subjects' && (
              <Button
                onClick={() => {
                  setSubDeptId(departments[0]?.id || '');
                  setSubjectScheme(schemes[0]?.id || '');
                  setIsSubjectModalOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Subject
              </Button>
            )}
          </>
        }
      />

      <FilterBar>
        <Tabs<AcademicsTab>
          value={activeTab}
          onChange={(next) => {
            setActiveTab(next);
            setSearchTerm('');
          }}
          options={[
            {
              value: 'departments',
              label: 'Departments',
              count: departments.length,
              icon: <Building2 className="w-3.5 h-3.5" />,
            },
            {
              value: 'classes',
              label: 'Classes',
              count: classes.length,
              icon: <GraduationCap className="w-3.5 h-3.5" />,
            },
            {
              value: 'subjects',
              label: 'Subjects',
              count: subjects.length,
              icon: <BookOpen className="w-3.5 h-3.5" />,
            },
          ]}
        />
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={`Search ${activeTab}...`}
          className="md:max-w-xs"
        />
      </FilterBar>

      {activeTab === 'departments' && (
        <DataTable
          data={filteredDepts}
          columns={deptColumns}
          keyExtractor={(d) => d.id}
          pageSize={12}
          renderMobileCard={(d) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-brand-600">
                  {d.code}
                </span>
                <span className="text-[11px] text-muted">
                  {allStudents.filter((s) => s.department_id === d.id).length} students
                </span>
              </div>
              <p className="text-xs font-medium text-primary">{d.name}</p>
              <p className="text-[11px] text-secondary line-clamp-2">{d.description}</p>
            </div>
          )}
        />
      )}

      {activeTab === 'classes' && (
        <DataTable
          data={filteredClasses}
          columns={classColumns}
          keyExtractor={(c) => c.id}
          pageSize={12}
          renderMobileCard={(c) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">{c.name}</span>
                <Badge variant="neutral">Sem {c.semester}</Badge>
              </div>
              <p className="text-[11px] text-secondary">
                {departments.find((d) => d.id === c.department_id)?.name} • {c.academic_year}
              </p>
            </div>
          )}
        />
      )}

      {activeTab === 'subjects' && (
        <DataTable
          data={filteredSubjects}
          columns={subjectColumns}
          keyExtractor={(s) => s.id}
          pageSize={12}
          renderMobileCard={(s) => (
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-semibold text-brand-600">
                  {s.code}
                </span>
                <p className="text-xs font-medium text-primary">{s.name}</p>
              </div>
              <Badge variant="neutral">{s.credits} Cr</Badge>
            </div>
          )}
        />
      )}

      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department"
        description="Register a new engineering department"
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <Input
            label="Department Name"
            required
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="e.g. Civil Engineering"
          />
          <Input
            label="Department Code"
            required
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value)}
            placeholder="e.g. CV"
            className="font-mono"
          />
          <Textarea
            label="Description"
            rows={2}
            value={deptDesc}
            onChange={(e) => setDeptDesc(e.target.value)}
          />
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Department</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Academic Class"
        description="Create a new semester section or batch"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            label="Class Identifier"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. CSE-5th Sem-Sec C"
          />
          <Select
            label="Department"
            value={classDeptId}
            onChange={(e) => { setClassDeptId(e.target.value); setClassProgramme(''); }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
          <Select label="Programme" required value={classProgramme} onChange={(e) => setClassProgramme(e.target.value)}>
            <option value="">Select a programme</option>
            {programmes.filter((programme) => programme.department_id === classDeptId).map((programme) =>
              <option key={programme.id} value={programme.id}>{programme.name}</option>)}
          </Select>
          <Select label="Academic scheme" required value={classScheme} onChange={(e) => setClassScheme(e.target.value)}>
            {schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Section" required value={classSection} onChange={(e) => setClassSection(e.target.value)} />
            <Input label="Admission batch" value={admissionBatch} onChange={(e) => setAdmissionBatch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Semester"
              type="number"
              min={1}
              max={12}
              value={classSemester}
              onChange={(e) => setClassSemester(Number(e.target.value))}
            />
            <Input
              label="Academic Year"
              value={classYear}
              onChange={(e) => setClassYear(e.target.value)}
              placeholder="2026-2027"
            />
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClassModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Class</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add Course Subject"
        description="Quickly register a course subject"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Code"
              required
              value={subCode}
              onChange={(e) => setSubCode(e.target.value)}
              placeholder="e.g. BCS505"
              className="font-mono"
            />
            <Input
              label="Credits"
              type="number"
              min={1}
              max={10}
              value={subCredits}
              onChange={(e) => setSubCredits(Number(e.target.value))}
            />
          </div>
          <Input
            label="Course Title"
            required
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="e.g. Distributed Systems"
          />
          <Select
            label="Department"
            value={subDeptId}
            onChange={(e) => setSubDeptId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
          <Select label="Academic scheme" required value={subjectScheme} onChange={(e) => setSubjectScheme(e.target.value)}>
            {schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
          </Select>
          <Input label="Semester" type="number" min={1} max={12} required value={subjectSemester}
            onChange={(e) => setSubjectSemester(Number(e.target.value))} />
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSubjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Subject</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
