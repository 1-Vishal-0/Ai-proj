import React, { useState } from 'react';
import { BookOpen, Layers, Plus, Building2, GraduationCap, CheckCircle2 } from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const AdminAcademicsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'classes' | 'subjects'>('departments');

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [className, setClassName] = useState('');
  const [classDeptId, setClassDeptId] = useState('');
  const [classSemester, setClassSemester] = useState(5);
  const [classYear, setClassYear] = useState('2026-2027');

  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDeptId, setSubDeptId] = useState('');
  const [subCredits, setSubCredits] = useState(3);

  const departments = db.getDepartments();
  const classes = db.getClasses();
  const subjects = db.getSubjects();

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    db.createDepartment({
      name: deptName.trim(),
      code: deptCode.trim().toUpperCase(),
      description: deptDesc.trim(),
      is_active: true,
    });
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setIsDeptModalOpen(false);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = classDeptId || departments[0]?.id || 'dept-cse';
    db.createClass({
      name: className.trim(),
      department_id: deptId,
      programme_id: 'prog-be-cse',
      vtu_scheme_id: 'scheme-vtu-2022',
      semester: Number(classSemester),
      section: 'A',
      academic_year: classYear.trim() || '2026-2027',
      admission_batch: '2024–2028',
    });
    setClassName('');
    setIsClassModalOpen(false);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = subCode.trim().toUpperCase();
    db.createSubject({
      code: cleanCode,
      name: subName.trim(),
      abbreviation: cleanCode,
      vtu_scheme_id: 'scheme-vtu-2022',
      department_id: subDeptId || departments[0]?.id || 'dept-cse',
      semester: 5,
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
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Structure & Curriculum</h2>
          <p className="text-xs text-slate-500">
            Configure institutional departments, student classes, and degree course subjects
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'departments' && (
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
          {activeTab === 'classes' && (
            <button
              onClick={() => {
                setClassDeptId(departments[0]?.id || '');
                setIsClassModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Class
            </button>
          )}
          {activeTab === 'subjects' && (
            <button
              onClick={() => {
                setSubDeptId(departments[0]?.id || '');
                setIsSubjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'departments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'classes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Academic Classes ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'subjects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Course Subjects ({subjects.length})
        </button>
      </div>

      {/* Departments Table */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Faculty & Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => {
                const sCount = db.getStudents().filter((s) => s.department_id === dept.id).length;
                const tCount = db.getTeachers().filter((t) => t.department_id === dept.id).length;
                return (
                  <tr key={dept.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{dept.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{dept.name}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-sm truncate">{dept.description || 'N/A'}</td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      <span className="font-semibold text-slate-800">{sCount}</span> Students •{' '}
                      <span className="font-semibold text-slate-800">{tCount}</span> Faculty
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Classes Table */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Class Identifier</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4 text-right">Enrolled Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls) => {
                const dept = departments.find((d) => d.id === cls.department_id);
                const enrolled = db.getStudents().filter((s) => s.class_id === cls.id).length;
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                    <td className="py-3 px-4 text-slate-600">{dept?.name || cls.department_id}</td>
                    <td className="py-3 px-4 font-mono">Sem {cls.semester}</td>
                    <td className="py-3 px-4 text-slate-500">{cls.academic_year}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      {enrolled} Students
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Subjects Table */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Course Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub) => {
                const dept = departments.find((d) => d.id === sub.department_id);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{sub.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-3 px-4 text-slate-600">{dept?.name || sub.department_id}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {sub.credits} Credits
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department"
        description="Register a new academic department in the institution"
      >
        <form onSubmit={handleCreateDept} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Civil Engineering"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Code *
            </label>
            <input
              type="text"
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              placeholder="e.g. CE"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Class Modal */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Academic Class"
        description="Create a class division or batch"
      >
        <form onSubmit={handleCreateClass} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Name *
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. CE-Year-3-A"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department *
            </label>
            <select
              value={classDeptId}
              onChange={(e) => setClassDeptId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester *
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={classSemester}
                onChange={(e) => setClassSemester(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year *
              </label>
              <input
                type="text"
                value={classYear}
                onChange={(e) => setClassYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Create Class
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add Course Subject"
        description="Register a new course subject with credit allocation"
      >
        <form onSubmit={handleCreateSubject} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Code *
              </label>
              <input
                type="text"
                required
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="e.g. CS505"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credits *
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={subCredits}
                onChange={(e) => setSubCredits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Title *
            </label>
            <input
              type="text"
              required
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department *
            </label>
            <select
              value={subDeptId}
              onChange={(e) => setSubDeptId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Create Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
