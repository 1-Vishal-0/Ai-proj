import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  BookMarked
} from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const AdminStudentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedScheme, setSelectedScheme] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Student Form State
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

  const students = db.getEnrichedStudents();
  const departments = db.getDepartments();
  const classes = db.getClasses();
  const programmes = db.getProgrammes();
  const schemes = db.getVTUSchemes();
  const settings = db.getSettings();

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === 'all' || s.class_id === selectedClass;
    const matchesDept = selectedDept === 'all' || s.department_id === selectedDept;
    const matchesScheme = selectedScheme === 'all' || s.vtu_scheme_id === selectedScheme;

    return matchesSearch && matchesClass && matchesDept && matchesScheme;
  });

  const handleDepartmentChange = (deptId: string) => {
    setFormDept(deptId);
    const matchingProg = programmes.find((p) => p.department_id === deptId);
    if (matchingProg) {
      setFormProgramme(matchingProg.id);
    }
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
    setFormScheme(schemes[0]?.id || 'scheme-vtu-2022');
    setFormClass(firstClass?.id || 'class-cse-5a');
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
      db.createStudent(
        {
          name: formName.trim(),
          email: formEmail.trim(),
          password_hash: 'student123',
          phone: formGuardianPhone,
          avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`,
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
    } catch (err: any) {
      setFormError(err.message || 'Failed to enroll student.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Directory & Enrollment</h2>
          <p className="text-xs text-slate-500">
            {students.length} enrolled students across active academic programmes and sections
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Enroll Student</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, Roll No (e.g. ENG22CS089), or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedScheme}
            onChange={(e) => setSelectedScheme(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none bg-white font-medium"
          >
            <option value="all">All Academic Regulations</option>
            {schemes.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none bg-white"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No / ID</th>
                <th className="py-3 px-4">Class & Scheme</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4 text-right">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const stats = db.calculateStudentAttendance(s.id);
                  const isLow = stats.percentage < settings.threshold_percentage;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                            alt={s.user.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{s.user.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {s.usn}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">
                          {s.academic_class?.name || s.class_id}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {s.vtu_scheme?.name || '2022 CBCS Regulation'} • Batch {s.admission_batch}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs ${
                              isLow ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {stats.percentage}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({stats.present}/{stats.totalSessions} sessions)
                          </span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              isLow ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, stats.percentage)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <p className="text-[11px] flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          {s.guardian_email || 'Not registered'}
                        </p>
                        <p className="text-[10px] flex items-center gap-1 text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {s.guardian_phone || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isLow ? (
                          <Badge variant="danger" dot>Debarred Risk</Badge>
                        ) : (
                          <Badge variant="success" dot>Eligible</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll Student"
        description="Register student profile with roll number, department, and academic scheme"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Student Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Varun Kumar"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email *
              </label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. varun.k@college.edu"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Roll No. / Registration No. *
              </label>
              <input
                type="text"
                required
                value={formUsn}
                onChange={(e) => setFormUsn(e.target.value.toUpperCase())}
                placeholder="e.g. 22CS090"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase font-bold text-blue-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admission Batch *
              </label>
              <input
                type="text"
                required
                value={formBatch}
                onChange={(e) => setFormBatch(e.target.value)}
                placeholder="2022-2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Scheme *
              </label>
              <select
                value={formScheme}
                onChange={(e) => setFormScheme(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none font-medium"
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
                value={formDept}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none font-medium"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Class Batch *
              </label>
              <select
                value={formClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none font-medium text-blue-900"
              >
                {(() => {
                  const filtered = classes.filter((c) => c.department_id === formDept);
                  const available = filtered.length > 0 ? filtered : classes;
                  return available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guardian Email
              </label>
              <input
                type="email"
                value={formGuardianEmail}
                onChange={(e) => setFormGuardianEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guardian Phone
              </label>
              <input
                type="tel"
                value={formGuardianPhone}
                onChange={(e) => setFormGuardianPhone(e.target.value)}
                placeholder="+91 94480 00000"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Enroll Student
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
