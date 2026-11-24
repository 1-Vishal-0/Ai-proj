import { settingsService } from '../services/settings.service';
import type { DayOfWeek } from '../types';

export const DAY_NAMES: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface PeriodSlotConfig {
  number: number;
  start: string;
  end: string;
  label: string;
}

export const PERIOD_SLOTS: PeriodSlotConfig[] = [
  { number: 1, start: '09:00', end: '10:00', label: '09:00 - 10:00' },
  { number: 2, start: '10:00', end: '11:00', label: '10:00 - 11:00' },
  { number: 3, start: '11:15', end: '12:15', label: '11:15 - 12:15' },
  { number: 4, start: '12:15', end: '13:15', label: '12:15 - 01:15' },
  { number: 5, start: '14:00', end: '15:00', label: '02:00 - 03:00' },
  { number: 6, start: '15:00', end: '16:00', label: '03:00 - 04:00' },
  { number: 7, start: '16:00', end: '17:00', label: '04:00 - 05:00' },
];

export const PERIOD_TIME_MAP: Record<number, { start: string; end: string }> =
  PERIOD_SLOTS.reduce(
    (acc, slot) => {
      acc[slot.number] = { start: slot.start, end: slot.end };
      return acc;
    },
    {} as Record<number, { start: string; end: string }>
  );

export function getTodayIsoDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: settingsService.getSettings().time_zone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts();
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getCurrentDayOfWeek(): DayOfWeek {
  const todayIdx = new Date(getTodayIsoDate() + 'T00:00:00Z').getUTCDay();
  return todayIdx >= 1 && todayIdx <= 6 ? DAY_NAMES[todayIdx - 1] : 'Monday';
}
