import React, { useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import type { DayOfWeek, EnrichedTimetableEntry } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { timetableService } from '../../../services/timetable.service';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { TimeInput } from '../../../components/ui/DatePicker';
import { DAY_NAMES, PERIOD_TIME_MAP } from '../../../lib/date';

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
  const { toast } = useToast();

  const [newDay, setNewDay] = useState<DayOfWeek>(() => slot?.day_of_week || 'Monday');
  const [newPeriod, setNewPeriod] = useState<number>(() => slot?.period_number || 1);
  const [newStartTime, setNewStartTime] = useState(() => slot?.start_time || '09:00');
  const [newEndTime, setNewEndTime] = useState(() => slot?.end_time || '10:00');
  const [newClassroom, setNewClassroom] = useState(() => slot?.classroom || '');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePeriodChange = (p: number) => {
    setNewPeriod(p);
    if (PERIOD_TIME_MAP[p]) {
      setNewStartTime(PERIOD_TIME_MAP[p].start);
      setNewEndTime(PERIOD_TIME_MAP[p].end);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !currentUser) return;
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Please specify a brief academic reason for rescheduling this period.');
      return;
    }

    setIsSubmitting(true);
    try {
      await timetableService.rescheduleSlot(
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

      toast({
        variant: 'success',
        title: 'Lecture slot rescheduled',
        description: `${slot.subject?.code} moved to ${newDay} Period ${newPeriod}. Enrolled students notified.`,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to reschedule lecture slot.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reschedule • ${slot.subject?.code}`}
      description={`${slot.subject?.name} — ${slot.academic_class?.name}`}
      size="lg"
    >
      <form onSubmit={handleReschedule} className="space-y-4">
        <div className="p-3 rounded-lg border border-border bg-subtle/50 text-xs flex flex-wrap items-center justify-between gap-2">
          <span className="text-secondary">
            Current:{' '}
            <strong className="text-primary">
              {slot.day_of_week} • Period {slot.period_number} ({slot.start_time}–{slot.end_time})
            </strong>
          </span>
          <span className="text-secondary font-mono">{slot.classroom}</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Target Day"
            value={newDay}
            onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
          >
            {DAY_NAMES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>

          <Select
            label="Target Period"
            value={newPeriod}
            onChange={(e) => handlePeriodChange(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <option key={p} value={p}>
                Period {p} ({PERIOD_TIME_MAP[p]?.start} - {PERIOD_TIME_MAP[p]?.end})
              </option>
            ))}
          </Select>

          <TimeInput
            label="Start Time"
            value={newStartTime}
            onChange={(e) => setNewStartTime(e.target.value)}
          />

          <TimeInput
            label="End Time"
            value={newEndTime}
            onChange={(e) => setNewEndTime(e.target.value)}
          />

          <div className="sm:col-span-2">
            <Input
              label="Classroom / Hall"
              value={newClassroom}
              onChange={(e) => setNewClassroom(e.target.value)}
              placeholder="e.g. LH-304, Mechanical Block"
            />
          </div>

          <div className="sm:col-span-2">
            <Textarea
              label="Reason for Change"
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lab demonstration arrangement or departmental seminar"
              hint="Students and HOD receive an automatic schedule update notice."
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Confirm &amp; Notify
          </Button>
        </div>
      </form>
    </Modal>
  );
};
