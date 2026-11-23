import React, { useState } from 'react';
import {
  GraduationCap,
  UserPlus,
  BookOpen,
  Plus,
  Trash2,
  Mail,
  Award,
  CheckCircle2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

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
  const { currentUser } = useAuth();
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Form states for Add Teacher
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('Assistant Professor');
  const [customDesignation, setCustomDesignation] = useState('');
  const [selectedQualification, setSelectedQualification] = useState('M.Tech / M.E.');
  const [customQualification, setCustomQualification] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Assignment
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [assignYear, setAssignYear] = useState('2026-2027');

  const teachers = db.getEnrichedTeachers();
  const departments = db.getDepartments();
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const assignments = db.getTeacherAssignments();

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
      selectedDesignation === 'Other' ? customDesignation.trim() : selectedDesignation;
    const finalQualification =
      selectedQualification === 'Other' ? customQualification.trim() : selectedQualification;

    if (!finalDesignation) {
      setFormError('Please select or specify the faculty designation.');
      return;
    }
    if (!finalQualification) {
      setFormError('Please select or specify the academic qualification.');
      return;
    }

    try {
      db.createTeacher(
        {
          name: name.trim(),
          email: email.trim(),
          password_hash: 'teacher123',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100',
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
    } catch (err: any) {
      setFormError(err.message || 'Failed to create teacher');
    }
  };

  const handleOpenAssign = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setAssignSubjectId(subjects[0]?.id || '');
    setAssignClassId(classes[0]?.id || '');
    setAssignYear('2026-2027');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.assignTeacher(
        {
          teacher_id: selectedTeacherId,
          subject_id: assignSubjectId,
          class_id: assignClassId,
          academic_year: assignYear,
        },
        currentUser?.id
      );
      setIsAssignModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to assign');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Members & Teaching Assignments</h2>
          <p className="text-xs text-slate-500">
            Manage teacher profiles, department designations, and subject allocations
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((teacher) => {
          const teacherAssignments = assignments.filter((a) => a.teacher_id === teacher.id);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.user.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100'}
                      alt={teacher.user.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{teacher.user.name}</h3>
                      <p className="text-xs text-blue-600 font-medium">{teacher.designation}</p>
                    </div>
                  </div>
                  <Badge variant="primary">{teacher.department?.code || 'DEPT'}</Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Employee ID:</span>
                    <span className="font-mono font-bold text-slate-800">{teacher.employee_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-[11px] text-slate-600">{teacher.user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Qualification:</span>
                    <span className="text-slate-700">{teacher.qualification || 'N/A'}</span>
                  </div>
                </div>

                {/* Assigned Subjects & Classes */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Assigned Subjects ({teacherAssignments.length})
                    </span>
                    <button
                      onClick={() => handleOpenAssign(teacher.id)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Assign
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {teacherAssignments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No subjects assigned yet.</p>
                    ) : (
                      teacherAssignments.map((assign) => {
                        const sub = subjects.find((s) => s.id === assign.subject_id);
                        const cls = classes.find((c) => c.id === assign.class_id);
                        return (
                          <div
                            key={assign.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                          >
                            <div>
                              <p className="font-bold text-slate-800">
                                {sub?.code}: {sub?.name}
                              </p>
                              <p className="text-slate-500 text-[10px]">
                                Class: {cls?.name} • {assign.academic_year}
                              </p>
                            </div>
                            <Badge variant="neutral" className="text-[10px]">
                              {cls?.name}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {teacherAssignments.length} Active Courses
                </span>
                <button
                  onClick={() => handleOpenAssign(teacher.id)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Configure Allocations
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
        title="Add Faculty Member"
        description="Create teacher profile and login credentials"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-3.5">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Khanna"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faculty Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rajesh.khanna@niet.edu"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP-CSE-105"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation *
              </label>
              <select
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {DESIGNATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {selectedDesignation === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customDesignation}
                    onChange={(e) => setCustomDesignation(e.target.value)}
                    placeholder="Enter designation manually..."
                    className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50/40 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qualification *
              </label>
              <select
                value={selectedQualification}
                onChange={(e) => setSelectedQualification(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {selectedQualification === 'Other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={customQualification}
                    onChange={(e) => setCustomQualification(e.target.value)}
                    placeholder="Enter qualification manually..."
                    className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50/40 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddTeacherOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Save Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher to Subject/Class Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Teaching Course"
        description="Allocate subject and target class to selected faculty member"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Subject *
            </label>
            <select
              value={assignSubjectId}
              onChange={(e) => setAssignSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name} ({sub.credits} Credits)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Target Class *
            </label>
            <select
              value={assignClassId}
              onChange={(e) => setAssignClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Semester {c.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={assignYear}
              onChange={(e) => setAssignYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Assign Course
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
