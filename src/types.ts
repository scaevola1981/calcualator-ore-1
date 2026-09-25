
export interface WorkSession {
  id?: string;
  startTime: Date;
  endTime: Date;
  modeFlag?: boolean; // Legacy - kept for compatibility, always false
}

export type SalaryMode = 'hourly' | 'monthly';

export type SpecialDayType = 'CO' | 'CM' | 'RECUPERARE' | 'INVOIRE' | 'LIBER_PLATIT';

export interface SpecialDay {
  date: string; // YYYY-MM-DD
  type: SpecialDayType;
  notes?: string;
}

export interface AppSettings {
  normalHoursLimit: number;
  hasNoLimit: boolean; // Legacy - kept for compatibility, always false (detailed mode)
  hourlyRate: number;
  currency: 'RON' | 'EUR';
  salaryMode: SalaryMode;
  monthlySalary: number;
  workingDaysPerMonth: number;
  salaryIsGross?: boolean;
  taxRatePercent?: number;
  grossSalary?: number; // Salariu brut de încadrare (ex: 7180 RON)
  sporRegieFixed?: number; // Spor de regie / weekend fix (1% din salariu brut = 71.80 RON)
  // Overtime multiplier (1 = same as normal rate)
  overtimeMultiplier?: number;
  overtimePercentage?: number;

  theme: 'light' | 'dark';
  legalHolidays: string[];
  // User & Employee Settings (Pentru Rapoarte & Pontaj)
  userName?: string;
  employeeId?: string;      // Marca (ex: AFD1270)
  companyName?: string;     // Companie / Punct de lucru (ex: AVICARVIL FOOD & DISTRIBUTION)
  department?: string;      // Departament (ex: Întreținere și mentenanță)
  jobTitle?: string;        // Funcție (ex: Lăcătuș mecanic)
  standardAdvance?: number;
  mealTicketValue?: number;

  specialDays?: SpecialDay[]; // Zile speciale: CO, CM, Recuperare, etc.
  smartAlertsEnabled?: boolean; // Alerte inteligente la 8h și 12h
  notificationSoundEnabled?: boolean; // Enable/disable notification sounds
}
