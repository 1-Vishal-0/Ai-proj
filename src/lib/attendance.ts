import type { AttendanceRosterEntry } from '../types';

export interface RosterSummary {
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
}

export function summarizeRoster(
  rosterMap: Record<string, AttendanceRosterEntry>,
  totalOverride?: number
): RosterSummary {
  let present = 0;
  let absent = 0;
  let leave = 0;

  Object.values(rosterMap).forEach((entry) => {
    if (entry.status === 'present') present++;
    else if (entry.status === 'absent') absent++;
    else if (entry.status === 'leave') leave++;
  });

  const total = totalOverride !== undefined ? totalOverride : present + absent + leave;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return { present, absent, leave, total, percentage };
}

export function calculateClassesNeededForThreshold(
  present: number,
  totalSessions: number,
  thresholdPercentage: number
): number {
  if (thresholdPercentage >= 100) {
    return totalSessions > present ? Number.POSITIVE_INFINITY : 0;
  }
  const currentPct = totalSessions > 0 ? (present / totalSessions) * 100 : 100;
  if (currentPct >= thresholdPercentage) return 0;

  return Math.max(
    0,
    Math.ceil(
      (thresholdPercentage * totalSessions - 100 * present) /
        (100 - thresholdPercentage)
    )
  );
}

export function calculateSafeAbsenceBuffer(
  present: number,
  totalSessions: number,
  thresholdPercentage: number
): number {
  if (thresholdPercentage <= 0) return 0;
  const currentPct = totalSessions > 0 ? (present / totalSessions) * 100 : 100;
  if (currentPct < thresholdPercentage) return 0;

  return Math.max(
    0,
    Math.floor((100 * present - thresholdPercentage * totalSessions) / thresholdPercentage)
  );
}
