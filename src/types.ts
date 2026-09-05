
export interface WorkSession {
  startTime: Date;
  endTime: Date;
  modeFlag?: boolean; // Legacy - kept for compatibility, always false
}

export type SalaryMode = 'hourly' | 'monthly';

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
  // User Settings
  userName?: string;
  standardAdvance?: number;
  mealTicketValue?: number;

  // Agent ZONA - Geofencing
  geofencingEnabled?: boolean;
  gateLatitude?: number;
  gateLongitude?: number;
  geofenceRadius?: number; // in meters
  notificationSoundEnabled?: boolean; // Enable/disable notification sounds
}
