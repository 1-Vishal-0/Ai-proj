import React, { useState } from 'react';
import { Clock, Calendar, BookOpen, Building, User } from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { DayOfWeek } from '../../types';

export const StudentTimetablePage: React.FC = () => {
  const { currentStudent } = useAuth();
  const studentId = currentStudent?.id || 'stu-amcec-1';
  const student = db.getEnrichedStudent(studentId);

  const dayNames: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const currentDayName: DayOfWeek = todayIdx >= 1 && todayIdx <= 6 ? dayNames[todayIdx - 1] : 'Monday';

  const [activeDay, setActiveDay] = useState<DayOfWeek>(currentDayName);

  const timetableEntries = student
    ? db.getEnrichedTimetable().filter((t) => t.class_id === student.class_id)
    : [];

  const todaysSchedule = timetableEntries.filter((t) => t.day_of_week === activeDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Class Lecture Timetable</h2>
        <p className="text-xs text-slate-500">
          Section Schedule: {student?.academic_class?.name} • {student?.vtu_scheme?.name || '2022 CBCS Regulation'}
        </p>
      </div>

      {/* Day Selector */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
        {dayNames.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeDay === d
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{d}</span>
            {d === currentDayName && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        {todaysSchedule.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm text-slate-400 text-xs">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No classes scheduled for {activeDay}. Enjoy your library or self-study time.
          </div>
        ) : (
          todaysSchedule.map((slot) => (
            <div
              key={slot.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-center shrink-0 w-20">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Period</span>
                <span className="text-xl font-extrabold font-mono">{slot.period_number}</span>
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {slot.subject?.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">{slot.subject?.name}</h3>
                </div>

                <p className="text-xs text-slate-600">
                  Faculty: <strong className="text-slate-800">{slot.teacher?.user.name}</strong> • Classroom:{' '}
                  <span className="font-semibold text-slate-700">{slot.classroom}</span>
                </p>

                <p className="text-[11px] text-slate-400 font-mono">
                  Time: {slot.start_time} - {slot.end_time} ({slot.subject?.credits} Credits)
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
