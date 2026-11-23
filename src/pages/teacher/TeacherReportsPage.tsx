import React, { useState } from 'react';
import { FileSpreadsheet, Download, Filter, Printer, Calendar } from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { exportToCSV } from '../../services/export.service';

export const TeacherReportsPage: React.FC = () => {
  const { currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const assignments = db.getTeacherAssignments(teacherId);
  const classes = db.getClasses().filter((c) => assignments.some((a) => a.class_id === c.id));
  const subjects = db.getSubjects().filter((s) => assignments.some((a) => a.subject_id === s.id));

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'class-cse-5a');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub-bcs501');

  const classStudents = db.getEnrichedStudents().filter((s) => s.class_id === selectedClassId);

  const reportData = classStudents.map((s) => {
    const stats = db.calculateStudentAttendance(s.id, selectedSubjectId);
    return {
      roll: s.roll_number,
      name: s.user.name,
      total: stats.totalSessions,
      present: stats.present,
      absent: stats.absent,
      leave: stats.leave,
      percentage: stats.percentage,
      status: stats.percentage < 75 ? 'Low Attendance' : 'Satisfactory',
    };
  });

  const handleExportCSV = () => {
    const cls = classes.find((c) => c.id === selectedClassId);
    const sub = subjects.find((s) => s.id === selectedSubjectId);
    const today = new Date().toISOString().split('T')[0];

    const headers = ['Roll Number', 'Student Name', 'Total Sessions', 'Attended', 'Absent', 'On Leave', 'Attendance %', 'Status'];
    const rows = reportData.map((d) => [
      d.roll,
      d.name,
      d.total,
      d.present,
      d.absent,
      d.leave,
      `${d.percentage}%`,
      d.status,
    ]);

    exportToCSV(`${sub?.code || 'Subject'}_${cls?.name || 'Class'}_Attendance_${today}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Attendance Reports & Export</h2>
          <p className="text-xs text-slate-500">
            Export official grade-book attendance spreadsheets for your assigned lectures
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Course Selector Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center no-print">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Select Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Course Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center">Conducted</th>
                <th className="py-3 px-4 text-center">Attended</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">On Leave</th>
                <th className="py-3 px-4 text-right">Attendance Rate</th>
                <th className="py-3 px-4 text-right">Criteria Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row) => (
                <tr key={row.roll} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.roll}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="py-3 px-4 text-center font-mono">{row.total}</td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600 font-bold">{row.present}</td>
                  <td className="py-3 px-4 text-center font-mono text-rose-600 font-bold">{row.absent}</td>
                  <td className="py-3 px-4 text-center font-mono text-amber-600">{row.leave}</td>
                  <td className="py-3 px-4 text-right font-bold font-mono">
                    <span className={row.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}>
                      {row.percentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.percentage < 75
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
