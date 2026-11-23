import React, { useState } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Calendar,
  Layers,
  User,
  ArrowUpDown
} from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { AttendanceSession, AttendanceRecord, EnrichedStudent } from '../../types';

export const AdminAttendanceMasterPage: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [inspectSession, setInspectSession] = useState<AttendanceSession | null>(null);

  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const teachers = db.getEnrichedTeachers();
  const students = db.getEnrichedStudents();

  const sessions = db.getSessions({
    class_id: selectedClass !== 'all' ? selectedClass : undefined,
    subject_id: selectedSubject !== 'all' ? selectedSubject : undefined,
    date: selectedDate ? selectedDate : undefined,
  });

  // Roster records for inspected session
  const inspectRecords: (AttendanceRecord & { student?: EnrichedStudent })[] = inspectSession
    ? db.getRecords(inspectSession.id).map((r) => {
        const student = students.find((s) => s.id === r.student_id);
        return { ...r, student };
      })
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Institution-Wide Master Attendance Sessions</h2>
          <p className="text-xs text-slate-500">
            Real-time logs of all conducted lectures, laboratory sessions, and attendance verification codes
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter by Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Academic Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter by Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Course Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Specific Date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Course Subject</th>
                <th className="py-3 px-4">Faculty Teacher</th>
                <th className="py-3 px-4">Proxy Code</th>
                <th className="py-3 px-4">Attendance Turnout</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No attendance sessions found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const cls = classes.find((c) => c.id === sess.class_id);
                  const sub = subjects.find((s) => s.id === sess.subject_id);
                  const teacher = teachers.find((t) => t.id === sess.teacher_id);
                  const records = db.getRecords(sess.id);
                  const presentCount = records.filter((r) => r.status === 'present').length;
                  const totalMarked = records.length;
                  const pct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{sess.date}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {sess.start_time} - {sess.end_time} ({sess.session_type})
                        </p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {cls?.name || sess.class_id}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{sub?.name || sess.subject_id}</p>
                        <p className="text-[10px] font-mono text-blue-600">{sub?.code}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-2">
                          <img
                            src={teacher?.user.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=60'}
                            alt={teacher?.user.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span>{teacher?.user.name || 'Assigned Faculty'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          <span>{sess.timetable_entry_id ? 'Timetable Session' : 'Direct Session'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pct}%</span>
                          <span className="text-[11px] text-slate-500">
                            ({presentCount}/{totalMarked} Present)
                          </span>
                        </div>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectSession(sess)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Inspect Roster</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster Details Modal */}
      {inspectSession && (
        <Modal
          isOpen={true}
          onClose={() => setInspectSession(null)}
          title={`Attendance Roster: ${inspectSession.date}`}
          description={`Class: ${
            classes.find((c) => c.id === inspectSession.class_id)?.name
          } • Subject: ${
            subjects.find((s) => s.id === inspectSession.subject_id)?.name
          }`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400">Total Enrolled: </span>
                <span className="font-bold text-slate-900">{inspectRecords.length} Students</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="success">
                  {inspectRecords.filter((r) => r.status === 'present').length} Present
                </Badge>
                <Badge variant="danger">
                  {inspectRecords.filter((r) => r.status === 'absent').length} Absent
                </Badge>
                <Badge variant="warning">
                  {inspectRecords.filter((r) => r.status === 'leave').length} Leave
                </Badge>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {inspectRecords.map((rec) => (
                <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-3">
                    <img
                      src={rec.student?.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                      alt={rec.student?.user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rec.student?.user.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {rec.student?.roll_number} • Marked via {rec.marked_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rec.remarks && (
                      <span className="text-[10px] text-slate-400 italic max-w-xs truncate">
                        "{rec.remarks}"
                      </span>
                    )}
                    <Badge
                      variant={
                        rec.status === 'present'
                          ? 'success'
                          : rec.status === 'absent'
                          ? 'danger'
                          : 'warning'
                      }
                      dot
                    >
                      {rec.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectSession(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
