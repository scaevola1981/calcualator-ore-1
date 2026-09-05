/**
 * Calculează tariful orar bazat pe salariu lunar
 * Formula: Salariu lunar / (zile lucratoare × 8 ore)
 */
export const calculateHourlyRate = (monthlySalary: number, workingDaysPerMonth: number): number => {
  if (workingDaysPerMonth <= 0) return 0;
  return monthlySalary / (workingDaysPerMonth * 8);
};

/**
 * Rotunjire Timp: FĂRĂ rotunjire la intrare/ieșire (se înregistrează timpul real de lucru)
 */
export const roundEntryTime = (date: Date): Date => {
  return new Date(date);
};

export const roundExitTime = (date: Date): Date => {
  return new Date(date);
};

/**
 * Calculează durata efectivă scăzând automat exact 30 minute de pauză de masă.
 */
export const calculateDurationWithBreak = (start: Date, end: Date): number => {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  let hours = diffMs / (1000 * 60 * 60);

  // Scade automat exact 30 min (0.5 ore) din fiecare sesiune zilnică lucrată
  if (hours > 0.5) {
    hours -= 0.5;
  } else {
    hours = 0;
  }

  return Math.max(0, hours);
};

/**
 * Calculează tariful orar efectiv ținând cont dacă salariul introdus este brut și de o rată de impozitare/retineri.
 * - Dacă `salaryMode` este `monthly`, folosește `monthlySalary` împărțit la (workingDaysPerMonth * 8)
 *   și, dacă `salaryIsGross` este adevărată, aplică `taxRatePercent` pentru a obține valoarea netă folosită la calcul.
 * - Dacă `salaryMode` este `hourly` => folosește `hourlyRate` direct.
 */
export const calculateEffectiveHourlyRate = (
  salaryMode: 'monthly' | 'hourly',
  monthlySalary: number,
  workingDaysPerMonth: number,
  hourlyRate: number,
  salaryIsGross: boolean = true,
  taxRatePercent: number = 0
): number => {
  if (salaryMode === 'monthly' && monthlySalary > 0 && workingDaysPerMonth > 0) {
    let base = monthlySalary;
    if (salaryIsGross && taxRatePercent > 0) {
      const factor = 1 - taxRatePercent / 100;
      base = base * factor;
    }
    return calculateHourlyRate(base, workingDaysPerMonth);
  }

  return hourlyRate;
};

/**
 * Calculează salariul pentru ore normale și overtime
 * Overtime = tarif normal × 2 (spor 100%)
 */
export const calculateSalary = (
  normalHours: number,
  overtimeHours: number,
  hourlyRate: number,
  overtimeMultiplier: number = 1
): { normalPay: number; overtimePay: number; totalPay: number } => {
  const normalPay = normalHours * hourlyRate;
  const overtimePay = overtimeHours * (hourlyRate * overtimeMultiplier);

  return {
    normalPay,
    overtimePay,
    totalPay: normalPay + overtimePay
  };
};

/**
 * Împarte orele între "normale" și "suplimentare" ținând cont de weekend și sărbători legale.
 * Regula: Dacă ziua este Sâmbătă(6), Duminică(0), sau o sărbătoare legală → toate orele sunt ore suplimentare.
 */
export const splitHoursByDay = (
  totalHours: number,
  date: Date,
  normalLimit: number,
  hasNoLimit: boolean,
  legalHolidays: string[] = []
): { normalHours: number; overtimeHours: number } => {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  // Format date to local YYYY-MM-DD for comparison
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${dayOfMonth}`;
  const isLegalHoliday = legalHolidays.includes(dateString);

  if (isWeekend || isLegalHoliday) {
    return { normalHours: 0, overtimeHours: totalHours };
  }

  if (hasNoLimit) {
    return { normalHours: totalHours, overtimeHours: 0 };
  }

  const normalHours = Math.min(totalHours, normalLimit);
  const overtimeHours = Math.max(0, totalHours - normalLimit);

  return { normalHours, overtimeHours };
};

/**
 * Splits a session that may span multiple calendar days into per-day sessions.
 * Each returned session has start/end constrained to the same calendar date.
 */
export const splitSessionByDay = (session: { startTime: Date; endTime: Date }) => {
  const segments: { startTime: Date; endTime: Date }[] = [];
  let curStart = new Date(session.startTime);
  const end = new Date(session.endTime);

  while (curStart < end) {
    const dayEnd = new Date(curStart);
    dayEnd.setHours(23, 59, 59, 999);
    const segEnd = dayEnd < end ? dayEnd : end;
    segments.push({ startTime: new Date(curStart), endTime: new Date(segEnd) });
    curStart = new Date(segEnd.getTime() + 1);
  }

  return segments;
};

/**
 * Calculates hours worked during night interval (22:00 - 06:00).
 * Assumes start and end are on the same calendar day (handled by splitSessionByDay elsewhere) OR handles crossing midnight if simpler.
 * 
 * Logic:
 * Night intervals on any given day D:
 * 1. 00:00 - 06:00 (Early Morning)
 * 2. 22:00 - 24:00 (Late Night)
 */
export const calculateNightHours = (startTime: Date, endTime: Date): number => {
  const start = startTime.getTime();
  const end = endTime.getTime();

  if (start >= end) return 0;

  // We are processing a segment. Ideally we split by day first.
  // But let's handle "intersection with night windows".
  // A session might span multiple days, but usually we split sessions before calling this or we handle it here.
  // The user requirement says "extract separate hours... sum them up".

  // Let's rely on the input being a continuous block. We'll iterate day by day.
  let current = new Date(start);
  let totalNightMs = 0;

  while (current.getTime() < end) {
    // Analyze current day
    const currentYear = current.getFullYear();
    const currentMonth = current.getMonth();
    const currentDate = current.getDate();

    // Define windows for this specific day
    // Window 1: 00:00 - 06:00
    const w1Start = new Date(currentYear, currentMonth, currentDate, 0, 0, 0).getTime();
    const w1End = new Date(currentYear, currentMonth, currentDate, 6, 0, 0).getTime();

    // Window 2: 22:00 - 24:00 (which is 00:00 next day)
    const w2Start = new Date(currentYear, currentMonth, currentDate, 22, 0, 0).getTime();
    const w2End = new Date(currentYear, currentMonth, currentDate + 1, 0, 0, 0).getTime();

    // Intersection with session end
    // We process until end of this day or end of session, whichever is simpler.
    // Actually, let's just use the windows against the full session range, assuming the windows repeat?
    // No, safest is to check intersection of [current, end] with [w1Start, w1End] and [w2Start, w2End].

    // Check Window 1
    const overlap1Start = Math.max(start, w1Start);
    const overlap1End = Math.min(end, w1End);
    if (overlap1End > overlap1Start) {
      totalNightMs += (overlap1End - overlap1Start);
    }

    // Check Window 2
    const overlap2Start = Math.max(start, w2Start);
    const overlap2End = Math.min(end, w2End);
    if (overlap2End > overlap2Start) {
      totalNightMs += (overlap2End - overlap2Start);
    }

    // Move to next day
    const nextDay = new Date(currentYear, currentMonth, currentDate + 1, 0, 0, 0);
    if (nextDay.getTime() >= end) break; // Finished
    current = nextDay;
    // Important: We must ensure we don't double count if we iterate.
    // But the logic above checks intersection of (start, end) with specific windows of Day X.
    // Since windows of Day X are disjoint from windows of Day X+1, this is safe.
  }

  return totalNightMs / (1000 * 60 * 60);
};
