import type { WorkSession } from '../types';

export interface ShiftPreset {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isOvernight?: boolean;
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 'schimbul_1',
    name: 'Schimbul 1 (06:30 - 15:00)',
    shortName: 'Sch. 1 (8h)',
    icon: '🌅',
    description: 'Program standard de zi: 8 ore normă (06:30 - 15:00)',
    startHour: 6,
    startMinute: 30,
    endHour: 15,
    endMinute: 0,
    isOvernight: false,
  },
  {
    id: 'schimbul_1_suplimentare',
    name: 'Schimbul 1 + 2h Suplim. (06:30 - 17:00)',
    shortName: 'Sch. 1 + OS (10h)',
    icon: '⚡',
    description: 'Zi prelungită: 8h normă + 2h suplimentare (pauză 30m inclusă)',
    startHour: 6,
    startMinute: 30,
    endHour: 17,
    endMinute: 0,
    isOvernight: false,
  },
  {
    id: 'schimbul_2',
    name: 'Schimbul 2 (14:30 - 23:00)',
    shortName: 'Sch. 2 (După-amiază)',
    icon: '🌇',
    description: 'Schimbul de după-amiază cu 1h spor noapte (după 22:00)',
    startHour: 14,
    startMinute: 30,
    endHour: 23,
    endMinute: 0,
    isOvernight: false,
  },
  {
    id: 'schimbul_3',
    name: 'Schimbul 3 - Noapte (22:30 - 07:00)',
    shortName: 'Sch. 3 (Noapte)',
    icon: '🌙',
    description: 'Tură integrală de noapte (+1 zi, 22:30 - 07:00)',
    startHour: 22,
    startMinute: 30,
    endHour: 7,
    endMinute: 0,
    isOvernight: true,
  },
  {
    id: 'tura_12h',
    name: 'Tură 12h Zi (07:00 - 19:30)',
    shortName: 'Tură 12h',
    icon: '⏱️',
    description: 'Program lung: 8h normă + 4h suplimentare (pauză dedusă)',
    startHour: 7,
    startMinute: 0,
    endHour: 19,
    endMinute: 30,
    isOvernight: false,
  },
];

/**
 * Creates a WorkSession based on a preset for a given target Date
 */
export const createSessionFromPreset = (preset: ShiftPreset, targetDate: Date): WorkSession => {
  const start = new Date(targetDate);
  start.setHours(preset.startHour, preset.startMinute, 0, 0);

  const end = new Date(targetDate);
  if (preset.isOvernight || preset.endHour < preset.startHour) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(preset.endHour, preset.endMinute, 0, 0);

  return {
    startTime: start,
    endTime: end,
  };
};
