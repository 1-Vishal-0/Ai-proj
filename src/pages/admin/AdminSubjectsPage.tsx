import React, { useState } from 'react';
import { BookOpen, Plus, Search, Filter, Layers, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { SubjectCategory, CourseType } from '../../types';

export const AdminSubjectsPage: React.FC = () => {
  const schemes = db.getVTUSchemes();
  const departments = db.getDepartments();
  const programmes = db.getProgrammes();
  const subjects = db.getSubjects();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states for new subject
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [schemeId, setSchemeId] = useState(schemes[0]?.id || 'scheme-vtu-2022');
  const [deptId, setDeptId] = useState(departments[0]?.id || 'dept-cse');
  const [semester, setSemester] = useState(5);
  const [category, setCategory] = useState<SubjectCategory>('PCC');
  const [courseType, setCourseType] = useState<CourseType>('theory');
  const [credits, setCredits] = useState(4);
  const [teachingHours, setTeachingHours] = useState(40);
  const [cieMarks, setCieMarks] = useState(50);
  const [seeMarks, setSeeMarks] = useState(50);

  const filteredSubjects = subjects.filter((s) => {
    const matchesScheme = selectedSchemeId === 'all' || s.vtu_scheme_id === selectedSchemeId;
    const matchesSemester = selectedSemester === 0 || s.semester === selectedSemester;
    const matchesDept = selectedDeptId === 'all' || s.department_id === selectedDeptId;
    const matchesSearch =
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesScheme && matchesSemester && matchesDept && matchesSearch;
  });

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    db.createSubject({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      abbreviation: abbreviation.trim().toUpperCase(),
      department_id: deptId,
      vtu_scheme_id: schemeId,
      semester: Number(semester),
      category,
      course_type: courseType,
      credits: Number(credits),
      teaching_hours: Number(teachingHours),
      cie_marks: Number(cieMarks),
      see_marks: Number(seeMarks),
      is_active: true,
    });

    setCode('');
    setName('');
    setAbbreviation('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Course Subject Master Catalogue</h2>
          <p className="text-xs text-slate-500">
            Curriculum subject codes, credit definitions, and category classifications
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course Subject</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by course code (e.g. BCS501, BMATS101) or course name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none font-medium"
          >
            <option value="all">All Academic Schemes</option>
            {schemes.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value={0}>All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Course Name & Abbreviation</th>
                <th className="py-3 px-4">Scheme</th>
                <th className="py-3 px-4">Sem</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Credits</th>
                <th className="py-3 px-4 text-center">CIE / SEE</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    No course subjects found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => {
                  const sch = schemes.find((s) => s.id === sub.vtu_scheme_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {sub.code}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{sub.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Abbr: {sub.abbreviation}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {sch?.name || sub.vtu_scheme_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        Sem {sub.semester}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {sub.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">
                        {sub.course_type}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-slate-800">
                        {sub.credits}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {sub.cie_marks}/{sub.see_marks}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="success" dot>Active</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Academic Course Subject"
        description="Add course with official subject code and syllabus credits"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Subject Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. BCS501 or BMATS101"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Abbreviation *
              </label>
              <input
                type="text"
                required
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="e.g. SEPM"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Software Engineering & Project Management"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Scheme *
              </label>
              <select
                value={schemeId}
                onChange={(e) => setSchemeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
              >
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester *
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SubjectCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
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
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Type
              </label>
              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value as CourseType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none capitalize"
              >
                <option value="theory">Theory</option>
                <option value="practical">Practical / Lab</option>
                <option value="integrated">Integrated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credits *
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Register Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
