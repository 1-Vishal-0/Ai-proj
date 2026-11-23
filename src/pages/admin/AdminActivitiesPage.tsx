import React, { useState } from 'react';
import { Award, Plus, Calendar, CheckCircle2, User, BookOpen, Layers } from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const AdminActivitiesPage: React.FC = () => {
  const activities = db.getAcademicActivities();
  const departments = db.getDepartments();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState(5);
  const [deptId, setDeptId] = useState(departments[0]?.id || 'dept-cse');
  const [coordinator, setCoordinator] = useState('');
  const [credits, setCredits] = useState(1);
  const [description, setDescription] = useState('');

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    db.createAcademicActivity({
      name: name.trim(),
      course_code: courseCode.trim().toUpperCase(),
      semester: Number(semester),
      department_id: deptId,
      academic_year: '2026-2027',
      faculty_coordinator: coordinator.trim(),
      credits: Number(credits),
      status: 'active',
      description: description.trim(),
    });

    setName('');
    setCourseCode('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Activities & Mandatory Courses</h2>
          <p className="text-xs text-slate-500">
            Track student participation in NSS, Social Connect, Yoga, Universal Human Values, and Project Phases
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register Activity Course</span>
        </button>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map((act) => {
          const dept = departments.find((d) => d.id === act.department_id);
          return (
            <div
              key={act.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Course: {act.course_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{act.name}</h3>
                  </div>
                  <Badge variant={act.status === 'completed' ? 'success' : 'primary'} dot>
                    Sem {act.semester}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {act.description || 'Mandatory curricular activity required for degree completion.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Coord: <strong>{act.faculty_coordinator}</strong>
                </span>
                <span className="font-bold text-slate-800">
                  {act.credits ? `${act.credits} Credits` : 'Non-Credit Mandatory'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Activity Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Academic Activity"
        description="Add mandatory activity, internship, or community project"
      >
        <form onSubmit={handleCreateActivity} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Major Project Phase-II"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. 22CSP75"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department
            </label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faculty Coordinator *
            </label>
            <input
              type="text"
              required
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              placeholder="e.g. Prof. Sandhya S."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline participation and evaluation requirements..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
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
              Save Activity
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
