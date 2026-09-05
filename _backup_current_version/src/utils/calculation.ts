export const splitHoursByDay = (
  totalHours: number,
  date: Date,
  normalLimit: number = 8,
  hasNoLimit: boolean,
  legalHolidays: string[] = []
): { normalHours: number; overtimeHours: number } => {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  // Format date to YYYY-MM-DD for comparison
  const dateString = date.toISOString().split('T')[0];
  const isLegalHoliday = legalHolidays.includes(dateString);

  if (isWeekend || isLegalHoliday) {
    if (hasNoLimit) {
        return { normalHours: totalHours, overtimeHours: 0 };
    }
    return { normalHours: 0, overtimeHours: totalHours };
  }

  if (hasNoLimit) {
    return { normalHours: totalHours, overtimeHours: 0 };
  }

  const normalHours = Math.min(totalHours, normalLimit);
  const overtimeHours = Math.max(0, totalHours - normalLimit);

  return { normalHours, overtimeHours };
};

export const calculateSessionEarnings = (
  durationHours: number,
  hourlyRate: number,
  hasNoLimit: boolean
): number => {
  // In the future this can use splitHoursByDay for complex calcs
  // For now, simple implementation based on "Fara Limita"
  
  if (hasNoLimit) {
    return durationHours * hourlyRate;
  }

  // Fallback for standard mode (currently simplified as just rate * hours in old code too, until strict mode added)
  // implementing the core split just in case specific logic needed later
  return durationHours * hourlyRate; 
};

export const roundEntryTime = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
};

export const roundExitTime = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
};

export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
