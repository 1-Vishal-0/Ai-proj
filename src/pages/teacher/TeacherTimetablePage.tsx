import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  BookOpen,
  Building,
  CheckCircle2,
  RotateCcw,
  CalendarCheck,
  History,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { DayOfWeek, EnrichedTimetableEntry } from '../../types';
import { QuickAttendanceModal } from '../../components/attendance/QuickAttendanceModal';
import { RescheduleSlotModal } from '../../components/timetable/RescheduleSlotModal';

interface TeacherTimetablePageProps {
  onNavigate: (viewId: string, params?: any) => void;
}

export const TeacherTimetablePage: React.FC<TeacherTimetablePageProps> = ({ onNavigate }) => {
  const { currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

  // Determine current day of week
  const dayNames: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const currentDayName: DayOfWeek = todayIdx >= 1 && todayIdx <= 6 ? dayNames[todayIdx - 1] : 'Monday';

  const [activeDay, setActiveDay] = useState<DayOfWeek>(currentDayName);
  const [attendanceModalSlot, setAttendanceModalSlot] = useState<{
    classId: string;
    subjectId: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  const [rescheduleSlot, setRescheduleSlot] = useState<EnrichedTimetableEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const timetableEntries = db.getEnrichedTimetable(teacherId);
  const todaysSchedule = timetableEntries.filter((t) => t.day_of_week === activeDay);
  const changeLogs = db.getTimetableChangeLogs(teacherId);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const teacherSessions = db.getSessions({ teacher_id: teacherId });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Timetable & Schedule Management</h2>
          <p className="text-xs text-slate-500">
            View your weekly periods, take instant attendance, and manage schedule adjustments
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Change History ({changeLogs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'schedule' && (
        <>
          {/* Day Selector Pills */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
            {dayNames.map((d) => {
              const daySlots = timetableEntries.filter((t) => t.day_of_week === d);
              return (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    activeDay === d
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{d}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      activeDay === d ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {daySlots.length}
                  </span>
                  {d === currentDayName && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            {todaysSchedule.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs text-slate-400 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No lecture periods scheduled for {activeDay}. You have a preparation or evaluation period.
              </div>
            ) : (
              todaysSchedule.map((slot) => {
                const isSubmitted =
                  activeDay === currentDayName &&
                  teacherSessions.some(
                    (s) =>
                      s.class_id === slot.class_id &&
                      s.subject_id === slot.subject_id &&
                      s.date === todayDateStr
                  );

                return (
                  <div
                    key={slot.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-center shrink-0 w-20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Period
                        </span>
                        <span className="text-xl font-bold font-mono">{slot.period_number}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {slot.subject?.code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">{slot.subject?.name}</h3>
                        </div>

                        <p className="text-xs text-slate-600">
                          Class: <strong>{slot.academic_class?.name}</strong> • Classroom:{' '}
                          <strong className="text-slate-800">{slot.classroom}</strong>
                        </p>

                        <p className="text-[11px] text-slate-400 font-mono">
                          {slot.start_time} - {slot.end_time} • {slot.subject?.category} ({slot.subject?.course_type})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isSubmitted && (
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          Marked Today
                        </span>
                      )}

                      <button
                        onClick={() =>
                          setAttendanceModalSlot({
                            classId: slot.class_id,
                            subjectId: slot.subject_id,
                            startTime: slot.start_time,
                            endTime: slot.end_time,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs transition"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Take Attendance</span>
                      </button>

                      <button
                        onClick={() => setRescheduleSlot(slot)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reschedule</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lecture Rescheduling Audit Trail</h3>
              <p className="text-xs text-slate-500">
                Log of class timing, classroom, and schedule changes with automated student alerts
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {changeLogs.length} changes</span>
          </div>

          <div className="overflow-x-auto">
            {changeLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No timetable changes recorded for your classes.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Subject & Class</th>
                    <th className="py-2.5 px-3">Original Schedule</th>
                    <th className="py-2.5 px-3">New Schedule</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{log.subject_code}</span>
                        <span className="text-slate-500 ml-1">({log.class_name})</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {log.old_day} • Period {log.old_period} ({log.old_classroom})
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-blue-700">
                        {log.new_day} • Period {log.new_period} ({log.new_classroom})
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        "{log.reason}"
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Applied & Notified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Quick Attendance Modal */}
      {attendanceModalSlot && (
        <QuickAttendanceModal
          isOpen={true}
          onClose={() => setAttendanceModalSlot(null)}
          classId={attendanceModalSlot.classId}
          subjectId={attendanceModalSlot.subjectId}
          startTime={attendanceModalSlot.startTime}
          endTime={attendanceModalSlot.endTime}
          onSaved={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Reschedule Slot Modal */}
      {rescheduleSlot && (
        <RescheduleSlotModal
          isOpen={true}
          onClose={() => setRescheduleSlot(null)}
          slot={rescheduleSlot}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
};
