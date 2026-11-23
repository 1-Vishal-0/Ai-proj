import React, { useState } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { exportToCSV } from '../../services/export.service';

interface StudentHistoryPageProps {
  onNavigate: (viewId: string) => void;
}

export const StudentHistoryPage: React.FC<StudentHistoryPageProps> = ({ onNavigate }) => {
  const { currentStudent } = useAuth();
  const studentId = currentStudent?.id || 'stu-amcec-1';

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const student = db.getEnrichedStudent(studentId);
  const subjects = db.getSubjects();

  // Get all sessions conducted for student's class
  const classSessions = student ? db.getSessions({ class_id: student.class_id }) : [];

  const historyRecords = classSessions
    .map((session) => {
      const rec = db.getStudentRecord(session.id, studentId);
      const subject = subjects.find((s) => s.id === session.subject_id);
      return {
        session,
        subject,
        status: rec ? rec.status : 'absent',
        markedBy: rec ? rec.marked_by : 'teacher',
        remarks: rec ? rec.remarks : undefined,
      };
    })
    .filter((item) => {
      const matchesSubject = selectedSubjectId === 'all' || item.subject?.id === selectedSubjectId;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      return matchesSubject && matchesStatus;
    });

  const handleExportMyHistory = () => {
    const today = new Date().toISOString().split('T')[0];
    const headers = ['Date', 'Time Slot', 'Subject Code', 'Subject Title', 'Session Type', 'My Attendance Status', 'Marked Via', 'Remarks'];
    const rows = historyRecords.map((r) => [
      r.session.date,
      `${r.session.start_time} - ${r.session.end_time}`,
      r.subject?.code || '',
      r.subject?.name || '',
      r.session.session_type,
      r.status.toUpperCase(),
      r.markedBy,
      r.remarks || 'None',
    ]);
    exportToCSV(`My_Attendance_Log_${today}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Personal Attendance Log & History</h2>
          <p className="text-xs text-slate-500">
            Comprehensive audit record of all conducted lectures and your presence standing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Log</span>
          </button>
          <button
            onClick={handleExportMyHistory}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center no-print">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter by Course</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Registered Courses</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
            <option value="leave">Leave Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Lecture Date</th>
                <th className="py-3 px-4">Course Subject</th>
                <th className="py-3 px-4">Slot & Type</th>
                <th className="py-3 px-4">My Status</th>
                <th className="py-3 px-4">Verification Method</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No lecture attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                historyRecords.map((item) => (
                  <tr key={item.session.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.session.date}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{item.subject?.name}</p>
                      <p className="text-[10px] text-blue-600 font-mono">{item.subject?.code}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {item.session.start_time} - {item.session.end_time} ({item.session.session_type})
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          item.status === 'present'
                            ? 'success'
                            : item.status === 'absent'
                            ? 'danger'
                            : 'warning'
                        }
                        dot
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                      {item.remarks && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">
                          "{item.remarks}"
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      <span className="text-[11px] font-mono">
                        {item.markedBy === 'code' ? 'Time-Limited Code' : item.markedBy === 'correction' ? 'Faculty Correction' : 'Teacher Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'absent' ? (
                        <button
                          onClick={() => onNavigate('student-correction')}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Request Correction</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
