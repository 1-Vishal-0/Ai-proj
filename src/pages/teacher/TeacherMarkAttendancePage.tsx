import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Users,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { AttendanceStatus, SessionType } from '../../types';
import { Badge } from '../../components/common/Badge';

export const TeacherMarkAttendancePage: React.FC = () => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const assignments = db.getTeacherAssignments(teacherId);
  const classes = db.getClasses().filter((c) => assignments.some((a) => a.class_id === c.id));
  const subjects = db.getSubjects().filter((s) => assignments.some((a) => a.subject_id === s.id));

  // Form selections
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'class-cse-5a');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub-bcs501');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [sessionType, setSessionType] = useState<SessionType>('lecture');

  // Search & Filter within roster
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'leave'>('all');

  // Roster attendance map: studentId -> { status: AttendanceStatus, remarks: string }
  const [rosterMap, setRosterMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Enrolled students for selected class
  const classStudents = db.getEnrichedStudents().filter((s) => s.class_id === selectedClassId);

  // When class, subject or date changes, check if session already exists in DB!
  useEffect(() => {
    const existingSession = db.getSessions().find(
      (s) =>
        s.class_id === selectedClassId &&
        s.subject_id === selectedSubjectId &&
        s.date === sessionDate
    );

    if (existingSession) {
      setActiveSessionId(existingSession.id);
      setStartTime(existingSession.start_time);
      setEndTime(existingSession.end_time);
      setSessionType(existingSession.session_type);

      // Load existing records
      const existingRecords = db.getRecords(existingSession.id);
      const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};

      classStudents.forEach((student) => {
        const found = existingRecords.find((r) => r.student_id === student.id);
        if (found) {
          newMap[student.id] = { status: found.status, remarks: found.remarks || '' };
        } else {
          newMap[student.id] = { status: 'present', remarks: '' };
        }
      });
      setRosterMap(newMap);
    } else {
      setActiveSessionId(null);
      // Default all to 'present' for easy marking
      const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      classStudents.forEach((student) => {
        newMap[student.id] = { status: 'present', remarks: '' };
      });
      setRosterMap(newMap);
    }
  }, [selectedClassId, selectedSubjectId, sessionDate]);

  // Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = { ...rosterMap };
    classStudents.forEach((s) => {
      updated[s.id] = { ...updated[s.id], status };
    });
    setRosterMap(updated);
  };

  const handleInvert = () => {
    const updated = { ...rosterMap };
    classStudents.forEach((s) => {
      const current = updated[s.id]?.status || 'present';
      updated[s.id] = {
        ...updated[s.id],
        status: current === 'present' ? 'absent' : 'present',
      };
    });
    setRosterMap(updated);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRosterMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setRosterMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  // Submit attendance to DB
  const handleSaveAttendance = () => {
    setSaveError(null);
    setSaveSuccessMsg(null);

    if (!currentUser) return;
    if (classStudents.length === 0) {
      setSaveError('No students enrolled in this class to mark.');
      return;
    }

    try {
      let targetSessionId = activeSessionId;

      // 1. If session does not exist yet, create it
      if (!targetSessionId) {
        const newSession = db.createSession(
          {
            class_id: selectedClassId,
            subject_id: selectedSubjectId,
            teacher_id: teacherId,
            date: sessionDate,
            start_time: startTime,
            end_time: endTime,
            session_type: sessionType,
            code: null,
            code_expires_at: null,
            is_code_active: false,
          },
          currentUser.id
        );
        targetSessionId = newSession.id;
        setActiveSessionId(newSession.id);
      }

      // 2. Prepare batch records (enforce duplicate prevention)
      const recordsToSave = classStudents.map((s) => ({
        session_id: targetSessionId!,
        student_id: s.id,
        status: rosterMap[s.id]?.status || 'present',
        marked_by: 'teacher' as const,
        remarks: rosterMap[s.id]?.remarks || undefined,
      }));

      // 3. Save batch in relational database
      db.markAttendanceBatch(recordsToSave, currentUser);

      setSaveSuccessMsg(
        `Attendance successfully saved for ${classStudents.length} students on ${sessionDate}!`
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save attendance record.');
    }
  };

  // Filtered student list
  const filteredStudents = classStudents.filter((s) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = rosterMap[s.id]?.status || 'present';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const presentCount = Object.values(rosterMap).filter((v) => v.status === 'present').length;
  const absentCount = Object.values(rosterMap).filter((v) => v.status === 'absent').length;
  const leaveCount = Object.values(rosterMap).filter((v) => v.status === 'leave').length;
  const turnoutPct =
    classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Mark Lecture & Session Attendance</h2>
        <p className="text-xs text-slate-500">
          Individual and bulk student attendance marking with duplicate prevention and audit logging
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Session Configuration Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            Lecture Details
          </h3>
          {activeSessionId && (
            <Badge variant="info">Editing Existing Session ({activeSessionId})</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class *</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Course Subject *</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Session Date *</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Session Type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
            >
              <option value="lecture">Lecture (Theory)</option>
              <option value="lab">Practical Lab</option>
              <option value="tutorial">Tutorial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Controls & Bulk Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Search & Filter */}
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="all">All ({classStudents.length})</option>
            <option value="present">Present ({presentCount})</option>
            <option value="absent">Absent ({absentCount})</option>
            <option value="leave">Leave ({leaveCount})</option>
          </select>
        </div>

        {/* Right: Bulk Buttons & Save */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Bulk Actions:</span>
          <button
            type="button"
            onClick={() => handleMarkAll('present')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('absent')}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> All Absent
          </button>
          <button
            type="button"
            onClick={handleInvert}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium transition"
          >
            Invert
          </button>
          <button
            type="button"
            onClick={handleSaveAttendance}
            className="ml-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Sheet</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Pill Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-100/70 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Users className="w-4 h-4 text-slate-500" />
          <span>Total: <strong className="text-slate-900">{classStudents.length}</strong></span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Present: {presentCount}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Absent: {absentCount}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>On Leave: {leaveCount}</span>
        </div>
        <span>•</span>
        <div className="font-bold text-blue-700">
          Turnout: {turnoutPct}%
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Student & Roll Number</th>
              <th className="py-3 px-4">Historical Attendance</th>
              <th className="py-3 px-4 text-center">Attendance Status</th>
              <th className="py-3 px-4">Remarks / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                  No students found in this class matching the search criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, idx) => {
                const currentStatus = rosterMap[student.id]?.status || 'present';
                const currentRemark = rosterMap[student.id]?.remarks || '';
                const studentStats = db.calculateStudentAttendance(student.id);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                          alt={student.user.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{student.user.name}</p>
                          <p className="font-mono text-[11px] text-blue-600 font-semibold">
                            {student.roll_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          studentStats.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {studentStats.percentage}%
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({studentStats.present}/{studentStats.totalSessions})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            currentStatus === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'leave')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                            currentStatus === 'leave'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks (e.g. 15m late, medical note)..."
                        value={currentRemark}
                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Submit Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Recorded by teacher {currentUser?.name} with automated duplicate validation.
          </p>
          <button
            type="button"
            onClick={handleSaveAttendance}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Attendance Sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
