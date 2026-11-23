import React, { useState } from 'react';
import { Clock, Plus, Trash2, Calendar, BookOpen, User, Building, AlertCircle } from 'lucide-react';
import { db } from '../../services/db/database';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { DayOfWeek } from '../../types';

export const AdminTimetablePage: React.FC = () => {
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const teachers = db.getEnrichedTeachers();
  const departments = db.getDepartments();
  const changeLogs = db.getTimetableChangeLogs();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'class-cse-5a');
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Monday');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 'sub-bcs501');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || 'teacher-amcec-1');
  const [classroom, setClassroom] = useState('LH-304, Mechanical Block');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const timetableEntries = db.getEnrichedTimetable().filter((t) => t.class_id === selectedClassId);

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const periods = [
    { number: 1, time: '09:00 - 10:00' },
    { number: 2, time: '10:00 - 11:00' },
    { number: 3, time: '11:15 - 12:15' },
    { number: 4, time: '12:15 - 01:15' },
    { number: 5, time: '02:00 - 03:00' },
    { number: 6, time: '03:00 - 04:00' },
  ];

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClass) return;

    try {
      db.createTimetableEntry({
        academic_year: selectedClass.academic_year,
        department_id: selectedClass.department_id,
        semester: selectedClass.semester,
        section: selectedClass.section,
        class_id: selectedClass.id,
        subject_id: subjectId,
        teacher_id: teacherId,
        classroom: classroom.trim(),
        day_of_week: dayOfWeek,
        period_number: Number(periodNumber),
        start_time: startTime,
        end_time: endTime,
      });

      setIsAddSlotOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule period.');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this timetable period?')) {
      db.deleteTimetableEntry(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Master Timetable Management</h2>
          <p className="text-xs text-slate-500">
            Configure weekly lecture periods, classroom assignments, and prevent faculty scheduling collisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.academic_year})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsAddSlotOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Slot</span>
          </button>
        </div>
      </div>

      {/* Timetable Weekly Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              Weekly Timetable: {selectedClass?.name} (Semester {selectedClass?.semester})
            </span>
          </div>
          <Badge variant="primary">Master Schedule</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-28 border-r border-slate-200">Day / Period</th>
                {periods.map((p) => (
                  <th key={p.number} className="py-2.5 px-3 border-r border-slate-200 text-center min-w-[150px]">
                    <div className="font-bold">Period {p.number}</div>
                    <div className="text-[10px] text-slate-400 font-normal font-mono">{p.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {days.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50 transition">
                  <td className="py-4 px-3 font-bold text-slate-800 bg-slate-50 border-r border-slate-200">
                    {day}
                  </td>
                  {periods.map((p) => {
                    const slot = timetableEntries.find(
                      (t) => t.day_of_week === day && t.period_number === p.number
                    );

                    return (
                      <td key={p.number} className="p-2 border-r border-slate-200 align-top">
                        {slot ? (
                          <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/70 space-y-1 relative group">
                            <button
                              onClick={() => handleDelete(slot.id)}
                              className="absolute top-1.5 right-1.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <p className="font-bold text-slate-900 text-xs line-clamp-1">
                              {slot.subject?.code}: {slot.subject?.abbreviation || slot.subject?.name}
                            </p>
                            <p className="text-[11px] text-slate-600 truncate">
                              {slot.teacher?.user.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              {slot.classroom}
                            </p>
                          </div>
                        ) : (
                          <div className="h-16 flex items-center justify-center text-slate-300 text-[11px]">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faculty Timetable Rescheduling Log & Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Faculty Timetable Rescheduling Log & Audit Trail
            </h3>
            <p className="text-[11px] text-slate-500">
              Institutional records of faculty-initiated timetable shifts, room relocations, and verified conflicts
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
            {changeLogs.length} Adjustments Logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Faculty Member</th>
                <th className="py-2.5 px-4">Class</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Slot Modification</th>
                <th className="py-2.5 px-4">Classroom</th>
                <th className="py-2.5 px-4">Justification</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changeLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No faculty timetable adjustments on record. Master schedule is active.
                  </td>
                </tr>
              ) : (
                changeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {log.teacher_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {log.class_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-blue-600 font-bold">{log.subject_code}</span>
                      <span className="text-slate-600 ml-1.5">{log.subject_name}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-500 line-through">
                          {log.old_day} P{log.old_period}
                        </span>
                        <span className="text-blue-600 font-bold">→</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                          {log.new_day} P{log.new_period}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {log.old_classroom !== log.new_classroom ? (
                        <div className="flex items-center gap-1">
                          <span className="line-through text-slate-400">{log.old_classroom}</span>
                          <span>→</span>
                          <span className="font-semibold text-slate-800">{log.new_classroom}</span>
                        </div>
                      ) : (
                        <span>{log.new_classroom}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate" title={log.reason}>
                      "{log.reason}"
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="success">Applied</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Slot Modal */}
      <Modal
        isOpen={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        title="Schedule Timetable Period"
        description={`Class: ${selectedClass?.name} (Semester ${selectedClass?.semester}, Sec ${selectedClass?.section})`}
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week *</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Period Number *</label>
              <select
                value={periodNumber}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setPeriodNumber(num);
                  const p = periods.find((x) => x.number === num);
                  if (p) {
                    const [s, end] = p.time.split(' - ');
                    setStartTime(s);
                    setEndTime(end);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
              >
                {periods.map((p) => (
                  <option key={p.number} value={p.number}>
                    Period {p.number} ({p.time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject (Course Code) *</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              {subjects
                .filter((s) => s.semester === selectedClass?.semester)
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name} ({sub.credits} Credits)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Teacher *</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user.name} ({t.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom / Laboratory *</label>
            <input
              type="text"
              required
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder="e.g. LH-304, Mechanical Block or CS-Lab-3"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddSlotOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Schedule Slot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
