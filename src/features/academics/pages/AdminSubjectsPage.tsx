import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CourseType, Subject, SubjectCategory } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
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
  type DataColumn,
} from '../../../components/ui';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const AdminSubjectsPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const schemes = academicsService.getSchemes();
  const departments = academicsService.getDepartments();
  const subjects = academicsService.getSubjects();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [schemeId, setSchemeId] = useState(
    schemes[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSchemeId
  );
  const [deptId, setDeptId] = useState(departments[0]?.id || 'dept-cse');
  const [semester, setSemester] = useState(5);
  const [category, setCategory] = useState<SubjectCategory>('PCC');
  const [courseType, setCourseType] = useState<CourseType>('theory');
  const [credits, setCredits] = useState(4);

  const filteredSubjects = subjects.filter((s) => {
    const matchesScheme =
      selectedSchemeId === 'all' || s.vtu_scheme_id === selectedSchemeId;
    const matchesSemester =
      selectedSemester === 0 || s.semester === selectedSemester;
    const matchesDept =
      selectedDeptId === 'all' || s.department_id === selectedDeptId;
    const matchesSearch =
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesScheme && matchesSemester && matchesDept && matchesSearch;
  });

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await academicsService.createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        abbreviation: abbreviation.trim().toUpperCase(),
        department_id: deptId,
        vtu_scheme_id: schemeId,
        semester: Number(semester),
        category,
        course_type: courseType,
        credits: Number(credits),
        teaching_hours: 40,
        cie_marks: 50,
        see_marks: 50,
        is_active: true,
      });

      setCode('');
      setName('');
      setAbbreviation('');
      setIsAddOpen(false);
      toast({
        variant: 'success',
        title: 'Subject registered',
        description: `${created.code} (${created.name}) added to catalogue.`,
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to create subject', description: err instanceof Error ? err.message : undefined });
    }
  };

  const columns: DataColumn<Subject>[] = [
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
      header: 'Course Title',
      sortValue: (s) => s.name,
      render: (s) => (
        <div>
          <p className="font-medium text-primary">{s.name}</p>
          <p className="text-[11px] text-muted font-mono">{s.abbreviation}</p>
        </div>
      ),
    },
    {
      key: 'scheme',
      header: 'Scheme',
      render: (s) => {
        const sch = schemes.find((item) => item.id === s.vtu_scheme_id);
        return (
          <span className="text-secondary">{sch?.name || s.vtu_scheme_id}</span>
        );
      },
    },
    {
      key: 'sem',
      header: 'Sem',
      sortValue: (s) => s.semester,
      render: (s) => (
        <span className="font-mono text-secondary tabular-nums">
          Sem {s.semester}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Badge variant="neutral">{s.category}</Badge>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) => (
        <span className="capitalize text-secondary">{s.course_type}</span>
      ),
    },
    {
      key: 'credits',
      header: 'Credits',
      align: 'center',
      sortValue: (s) => s.credits,
      render: (s) => (
        <span className="font-mono font-semibold tabular-nums">{s.credits}</span>
      ),
    },
    {
      key: 'marks',
      header: 'CIE / SEE',
      align: 'center',
      render: (s) => (
        <span className="font-mono text-secondary tabular-nums">
          {s.cie_marks}/{s.see_marks}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: () => (
        <Badge variant="success" dot>
          Active
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Course Subject Catalogue"
        description={`${filteredSubjects.length} of ${subjects.length} curriculum subjects matching current filters`}
        actions={
          <Button
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Register Subject
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by code (BCS501), title or abbreviation..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
          <Select
            value={selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
            aria-label="Filter by academic scheme"
          >
            <option value="all">All Schemes</option>
            {schemes.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.name}
              </option>
            ))}
          </Select>

          <Select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            aria-label="Filter by semester"
          >
            <option value={0}>All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </Select>

          <Select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
        </div>
      </FilterBar>

      <DataTable
        data={filteredSubjects}
        columns={columns}
        keyExtractor={(s) => s.id}
        pageSize={12}
        stickyHeader
        selectable
        renderMobileCard={(s) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-brand-600">
                {s.code} ({s.abbreviation})
              </span>
              <Badge variant="neutral">Sem {s.semester}</Badge>
            </div>
            <p className="text-xs font-medium text-primary">{s.name}</p>
            <div className="flex items-center justify-between text-[11px] text-secondary">
              <span>
                {s.category} • {s.course_type}
              </span>
              <span className="font-mono">{s.credits} Credits</span>
            </div>
          </div>
        )}
      />

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Course Subject"
        description="Add a new course with official code, category and credit weight"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Subject Code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BCS501"
              className="font-mono"
            />
            <Input
              label="Abbreviation"
              required
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              placeholder="e.g. SEPM"
              className="font-mono"
            />
          </div>

          <Input
            label="Course Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Software Engineering & Project Management"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Select
              label="Academic Scheme"
              value={schemeId}
              onChange={(e) => setSchemeId(e.target.value)}
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              label="Department"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>

            <Input
              label="Semester"
              type="number"
              min={1}
              max={8}
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as SubjectCategory)}
            >
              <option value="BSC">Basic Science (BSC)</option>
              <option value="ESC">Engineering Science (ESC)</option>
              <option value="PCC">Professional Core (PCC)</option>
              <option value="PEC">Professional Elective (PEC)</option>
              <option value="OEC">Open Elective (OEC)</option>
              <option value="HSMC">Humanities & Social (HSMC)</option>
              <option value="AEC">Ability Enhancement (AEC)</option>
              <option value="SEC">Skill Enhancement (SEC)</option>
              <option value="PCCL">Laboratory Course (PCCL)</option>
              <option value="PROJ">Project Work (PROJ)</option>
              <option value="INT">Internship (INT)</option>
              <option value="MC">Mandatory Course (MC)</option>
            </Select>

            <Select
              label="Course Type"
              value={courseType}
              onChange={(e) => setCourseType(e.target.value as CourseType)}
            >
              <option value="theory">Theory</option>
              <option value="practical">Practical / Lab</option>
              <option value="integrated">Integrated</option>
            </Select>

            <Input
              label="Credits"
              type="number"
              step="0.5"
              min={0}
              max={10}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Register Subject</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
