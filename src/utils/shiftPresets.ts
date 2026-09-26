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

/**
 * Schimburile reale din fabrica lui Florin:
 * - Schimbul 1: 06:30 - 16:30 (10 ore: 8h normă + 1.5h suplimentare după deducere 30m pauză)
 * - Schimbul 1 Scurt: 06:30 - 15:00 (8h normă fără suplimentare)
 */
export const SHIFT_PRESETS: ShiftPreset[] = [
  {
    id: 'schimbul_1_complet',
    name: 'Schimbul 1 (06:30 - 16:30)',
    shortName: 'Schimbul 1',
    icon: '🌅',
    description: 'Program standard Schimbul 1: 06:30 – 16:30 (8h normă + 1.5h suplimentare)',
    startHour: 6,
    startMinute: 30,
    endHour: 16,
    endMinute: 30,
    isOvernight: false,
  },
  {
    id: 'schimbul_1_scurt',
    name: 'Schimbul 1 Scurt (06:30 - 15:00)',
    shortName: 'Sch. 1 (8h)',
    icon: '☀️',
    description: 'Zi fără suplimentare: 06:30 – 15:00 (8 ore normă de bază)',
    startHour: 6,
    startMinute: 30,
    endHour: 15,
    endMinute: 0,
    isOvernight: false,
  },
];

/**
 * Ore frecvente de ieșire pentru Schimbul 2 (care începe mereu la 16:30)
 */
export interface Shift2ExitOption {
  label: string;
  endHour: number;
  endMinute: number;
  description: string;
}

export const SHIFT_2_COMMON_EXITS: Shift2ExitOption[] = [
  { label: '01:00', endHour: 1, endMinute: 0, description: '8.5h brut (8h normă + 3h noapte)' },
  { label: '01:30', endHour: 1, endMinute: 30, description: '9.0h brut (8h normă + 0.5h supl. + 3.5h noapte)' },
  { label: '02:00', endHour: 2, endMinute: 0, description: '9.5h brut (8h normă + 1.0h supl. + 4h noapte)' },
  { label: '02:30', endHour: 2, endMinute: 30, description: '10.0h brut (8h normă + 1.5h supl. + 4.5h noapte)' },
  { label: '03:00', endHour: 3, endMinute: 0, description: '10.5h brut (8h normă + 2.0h supl. + 5h noapte)' },
  { label: '03:30', endHour: 3, endMinute: 30, description: '11.0h brut (8h normă + 2.5h supl. + 5.5h noapte)' },
];

/**
 * Creează o sesiune de lucru din preset pe o anumită dată
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

/**
 * Creează o sesiune pentru Schimbul 2 (Start fix 16:30, sfârșit flexibil noaptea în ziua următoare)
 */
export const createShift2Session = (
  targetDate: Date,
  endHour: number,
  endMinute: number
): WorkSession => {
  const start = new Date(targetDate);
  start.setHours(16, 30, 0, 0);

  const end = new Date(targetDate);
  // Dacă ora de sfârșit este mai mică de 16 (de ex: 01:00, 02:00), înseamnă că s-a terminat după miezul nopții (+1 zi)
  if (endHour < 16) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(endHour, endMinute, 0, 0);

  return {
    startTime: start,
    endTime: end,
  };
};
