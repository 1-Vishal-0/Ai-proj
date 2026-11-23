import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle2,
  Save,
  ArrowRight
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { EnrichedTimetableEntry, DayOfWeek } from '../../types';
import { Modal } from '../common/Modal';

interface RescheduleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: EnrichedTimetableEntry | null;
  onSuccess: () => void;
}

export const RescheduleSlotModal: React.FC<RescheduleSlotModalProps> = ({
  isOpen,
  onClose,
  slot,
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  const [newDay, setNewDay] = useState<DayOfWeek>('Monday');
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newClassroom, setNewClassroom] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const periodTimeMap: Record<number, { start: string; end: string }> = {
    1: { start: '09:00', end: '10:00' },
    2: { start: '10:00', end: '11:00' },
    3: { start: '11:15', end: '12:15' },
    4: { start: '12:15', end: '13:15' },
    5: { start: '14:00', end: '15:00' },
    6: { start: '15:00', end: '16:00' },
    7: { start: '16:00', end: '17:00' },
  };

  useEffect(() => {
    if (slot && isOpen) {
      setNewDay(slot.day_of_week);
      setNewPeriod(slot.period_number);
      setNewStartTime(slot.start_time);
      setNewEndTime(slot.end_time);
      setNewClassroom(slot.classroom);
      setReason('');
      setErrorMsg(null);
    }
  }, [slot, isOpen]);

  const handlePeriodChange = (p: number) => {
    setNewPeriod(p);
    if (periodTimeMap[p]) {
      setNewStartTime(periodTimeMap[p].start);
      setNewEndTime(periodTimeMap[p].end);
    }
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !currentUser) return;
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Please specify a brief academic reason for rescheduling this lecture period.');
      return;
    }

    setIsSubmitting(true);
    try {
      db.rescheduleTimetableSlot(
        {
          entryId: slot.id,
          newDay,
          newPeriod: Number(newPeriod),
          newStartTime,
          newEndTime,
          newClassroom: newClassroom.trim() || slot.classroom,
          reason: reason.trim(),
        },
        currentUser
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reschedule lecture slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reschedule Lecture: ${slot.subject?.code} (${slot.academic_class?.name})`}
      size="lg"
    >
      <form onSubmit={handleReschedule} className="space-y-4">
        {/* Current Schedule Summary */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Current Schedule
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-slate-900">
              {slot.day_of_week} • Period {slot.period_number} ({slot.start_time} - {slot.end_time})
            </span>
            <span className="text-slate-600 font-medium">Room: {slot.classroom}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* New Day */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Day of Week
            </label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* New Period */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Period (Period 1 to 7)
            </label>
            <select
              value={newPeriod}
              onChange={(e) => handlePeriodChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <option key={p} value={p}>
                  Period {p} ({periodTimeMap[p]?.start} - {periodTimeMap[p]?.end})
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Target Classroom */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Classroom / Lecture Hall
            </label>
            <input
              type="text"
              value={newClassroom}
              onChange={(e) => setNewClassroom(e.target.value)}
              placeholder="e.g. LH-304, Mechanical Block or LH-201"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Rescheduling <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Special revision session, laboratory demonstration arrangement, or departmental symposium"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enrolled students and HOD will automatically receive an instant notification with this reason.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Checking Conflicts...' : 'Confirm & Notify Students'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
