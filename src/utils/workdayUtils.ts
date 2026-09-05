import type { WorkSession } from '../types';

function getDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import { splitSessionByDay } from './timeRounding';

export function countWorkdaysFromSessions(sessions: WorkSession[], monthDate: Date, legalHolidays: string[] = []): number {
  const keys = new Set<string>();
  sessions.forEach(s => {
    const segments = splitSessionByDay({ startTime: new Date(s.startTime), endTime: new Date(s.endTime) });
    segments.forEach(seg => {
      const d = new Date(seg.startTime);
      if (d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()) {
        keys.add(getDateKey(d));
      }
    });
  });

  let count = 0;
  for (const k of keys) {
    const parts = k.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) continue;
    if (legalHolidays.includes(k)) continue;
    count++;
  }
  return count;
}

export default { countWorkdaysFromSessions };
