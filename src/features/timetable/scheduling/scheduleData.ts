import { useEffect, useState } from 'react';
import { requireSupabase } from '../../../services/supabaseClient';

export type Version = { id: string; name: string; effective: string | null };
export type Slot = {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  academic_year: string;
  classroom: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  lecture_kind: string;
};
export type Request = {
  id: string;
  slot_id: string;
  day: string;
  operation: string;
  reason: string;
  status: string;
  new_day: string | null;
  starts: string | null;
  ends: string | null;
  classroom: string | null;
  substitute: string | null;
};

export function useScheduleData<T>(load: () => Promise<T>, key: string) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    let stale = false;
    void load()
      .then((data) => {
        if (!stale) setResult({ key, data });
      })
      .catch((error) => {
        if (!stale)
          setResult({
            key,
            error:
              error instanceof Error ? error.message : 'Schedule unavailable.',
          });
      });
    return () => {
      stale = true;
    };
    // The key changes with the request parameters.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result : undefined;
}

export async function fetchRows<T>(
  table: string,
  filter?: { column: string; value: string },
) {
  let query = requireSupabase().from(table).select('*');
  if (filter) query = query.eq(filter.column, filter.value);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T[];
}
