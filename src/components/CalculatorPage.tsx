
import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { AppSettings, WorkSession } from '../types';

interface CalculatorPageProps {
  totalHours?: number;
  totalNormalHours?: number;
  totalOvertimeHours?: number;
  totalNightHours?: number;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  workedDaysCount?: number;
  workSessions?: WorkSession[];
  referenceDate?: Date;
}

// Helper to count Mon-Fri days in a month (Loop Safe)
const getWorkingDaysInMonth = (year: number, month: number): number => {
  // Safety guard
  if (year < 2000 || year > 2100 || month < 0 || month > 11) return 21;

  let count = 0;
  // Iterate definitively from day 1 to 31
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month, day);
    // If we rolled over to the next month, stop
    if (date.getMonth() !== month) break;

    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
};

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  totalNormalHours = 0,
  totalOvertimeHours = 0,
  totalNightHours = 0,
  settings,
  onSettingsChange,
  workSessions = [],
  referenceDate
}) => {
  // Use current date if no reference provided
  const refDate = useMemo(() => {
    return (referenceDate instanceof Date && !isNaN(referenceDate.getTime())) ? referenceDate : new Date();
  }, [referenceDate]);

  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();

  // Dynamic Standard Working Days (Mon-Fri) for the selected month
  const standardWorkingDays = useMemo(() => {
    return getWorkingDaysInMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // --- STATE ---
  // Zone 1: Baza
  const salaryNet = settings.monthlySalary || 0;

  // Zone 2: Pontaj (Editable local state, populated with rounding)
  const [hours, setHours] = useState({
    normal: Math.floor((totalNormalHours || 0) * 100) / 100, // Round to 2 decimals, handle undefined
    night: Math.floor((totalNightHours || 0) * 100) / 100,
    overtime: Math.floor((totalOvertimeHours || 0) * 100) / 100
  });

  // Calculate estimated tickets based on work history (Mon-Fri only)
  const estimatedTickets = useMemo(() => {
    if (!workSessions || !Array.isArray(workSessions) || !workSessions.length) return 0;
    const uniqueDays = new Set<string>();
    try {
      workSessions.forEach(session => {
        if (!session.startTime) return;
        const d = new Date(session.startTime);
        if (isNaN(d.getTime())) return;

        // Date string Key (YYYY-MM-DD)
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
        // Count only Mon-Fri (1-5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          uniqueDays.add(key);
        }
      });
    } catch (e) {
      console.error("Error calculating tickets", e);
      return 0;
    }
    return uniqueDays.size;
  }, [workSessions]);

  // Zone 3: Extra
  const [extras, setExtras] = useState({
    mealTicketsCount: estimatedTickets,
    mealTicketValue: settings.mealTicketValue || 22,
    advance: settings.standardAdvance || 0
  });

  useEffect(() => {
    setExtras(prev => ({
      ...prev,
      mealTicketValue: settings.mealTicketValue || 22,
      advance: (prev.advance === 0 && settings.standardAdvance) ? settings.standardAdvance : prev.advance
    }));
  }, [settings.mealTicketValue, settings.standardAdvance]);

  // Sync state if props change significantly
  useEffect(() => {
    setHours(prev => ({
      ...prev,
      normal: Math.floor((totalNormalHours || 0) * 100) / 100, // Round down/clean
      overtime: Math.floor((totalOvertimeHours || 0) * 100) / 100,
      night: Math.floor((totalNightHours || 0) * 100) / 100
    }));
  }, [totalNormalHours, totalOvertimeHours, totalNightHours]);

  useEffect(() => {
    if (estimatedTickets !== extras.mealTicketsCount) {
      setExtras(prev => ({ ...prev, mealTicketsCount: estimatedTickets }));
    }
  }, [estimatedTickets]);

  // --- LOGIC ---
  // Hourly Rate:
  // - In SIMPLE mode (hasNoLimit=true): Use editable settings.hourlyRate
  // - In DETAILED mode (hasNoLimit=false): Calculate from monthly salary
  const hourlyRate = settings.hasNoLimit
    ? (settings.hourlyRate || 0)
    : (standardWorkingDays > 0 ? (salaryNet / standardWorkingDays / 8) : 0);

  // SALARY CALCULATIONS - Strict separation between modes
  let totalIncomeHours = 0;
  let incomeTickets = 0;
  let deductions = 0;
  let restDePlata = 0;

  if (settings.hasNoLimit) {
    // === SIMPLE MODE: Formula Unică ===
    // Salariu_Total = Total_Ore_Înregistrate × Tarif_Orar
    // NO breakdown, NO differentiation between hour types
    const totalHours = (totalNormalHours || 0) + (totalOvertimeHours || 0) + (totalNightHours || 0);
    totalIncomeHours = totalHours * hourlyRate;
    restDePlata = totalIncomeHours; // No tickets, no deductions in simple mode
  } else {
    // === DETAILED MODE: Full breakdown ===
    // Formula: (A) Venit Ore (differentiated)
    const incomeNormal = hours.normal * hourlyRate;
    const incomeNight = hours.night * hourlyRate * 1.25;
    const multiplier = (settings.overtimePercentage || 200) / 100;
    const incomeOvertime = hours.overtime * hourlyRate * multiplier;
    totalIncomeHours = incomeNormal + incomeNight + incomeOvertime;

    // Formula: (B) Tichete
    incomeTickets = extras.mealTicketsCount * extras.mealTicketValue;

    // Formula: (C) Deduceri (Avans)
    deductions = extras.advance;

    // TOTAL
    restDePlata = (totalIncomeHours + incomeTickets) - deductions;
  }


  // --- HANDLERS ---
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    onSettingsChange({ ...settings, monthlySalary: val });
  };

  const handleHoursChange = (field: keyof typeof hours, value: string) => {
    if (value === '') {
      setHours(prev => ({ ...prev, [field]: 0 }));
      return;
    }
    setHours(prev => ({ ...prev, [field]: parseFloat(value) }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* HEADER - Blue Gradient Restored */}
      <header className="px-6 pt-12 pb-10 mb-6 relative z-0 header-gradient-bg rounded-b-[30px] shadow-lg -mx-4 -mt-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-1">
              Calculator
            </h1>
            <p className="text-white/90 text-sm font-medium flex items-center gap-2">
              Salariu curent: <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">{settings.monthlySalary} {settings.currency}</span>
            </p>
          </div>

          {/* Toggle Mode Button - Integrated in Header */}
          <div className="bg-white/20 p-1 rounded-full flex relative backdrop-blur-sm border border-white/30 self-center">
            <button
              onClick={() => onSettingsChange({ ...settings, hasNoLimit: true })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${settings.hasNoLimit ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
            >
              Simplu
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, hasNoLimit: false })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!settings.hasNoLimit ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
            >
              Detaliat
            </button>
          </div>
        </div>
      </header>

      {settings.hasNoLimit ? (
        // === SIMPLE MODE: All hours at same rate ===
        <>
          <div className="card-v6 flex items-center gap-3 mb-6 p-4 rounded-[20px]">
            <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
              <Clock className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fără Limită</h2>
              <p className="text-xs font-semibold text-white/60">Toate orele la același preț</p>
            </div>
          </div>

          {/* Total Hours Display */}
          <div className="card-v6 p-8 rounded-[30px]">
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-white/60 uppercase tracking-wider">Total Ore Lucrate</p>
              <div className="text-7xl font-black text-white tracking-tight drop-shadow-lg">
                {((totalNormalHours || 0) + (totalOvertimeHours || 0) + (totalNightHours || 0)).toFixed(1)}
              </div>
              <p className="text-lg font-bold text-white/50">ore</p>
            </div>
          </div>

          <div className="card-v6 p-5 rounded-[30px] mt-4">
            <label className="block text-sm font-bold text-white/80 mb-2">
              Plată pe Oră ({settings.currency})
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.hourlyRate || ''}
                onChange={(e) => onSettingsChange({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })}
                placeholder="Ex: 25"
                className="w-full text-2xl font-bold bg-transparent border-b-2 border-white/20 focus:border-green-400 outline-none py-2 text-white placeholder-white/20"
              />
              <span className="absolute right-0 bottom-3 text-sm font-bold text-white/60">{settings.currency}/h</span>
            </div>
          </div>

          {/* Total Salary Result */}
          <div className="fixed bottom-24 inset-x-6 max-w-[400px] mx-auto">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-[30px] shadow-2xl p-6 text-white relative overflow-hidden ring-4 ring-white/10 backdrop-blur-xl">
              <div className="relative z-10">
                <p className="text-sm font-bold opacity-80 mb-1 uppercase tracking-wider">SALARIU TOTAL</p>
                <h3 className="text-5xl font-black tracking-tighter shadow-sm">
                  {(((totalNormalHours || 0) + (totalOvertimeHours || 0) + (totalNightHours || 0)) * (settings.hourlyRate || 0)).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <span className="text-xl ml-2 font-normal opacity-70">{settings.currency}</span>
                </h3>
                <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-70 font-mono font-bold">
                  {((totalNormalHours || 0) + (totalOvertimeHours || 0) + (totalNightHours || 0)).toFixed(1)}h × {(settings.hourlyRate || 0).toFixed(2)} {settings.currency}/h
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // === DETAILED MODE: Full salary breakdown ===
        <>
          {/* ZONA 4: REZULTAT - Moved to TOP as per design */}
          <div className="card-v6 relative overflow-hidden rounded-[30px] p-6 transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">TOTAL LICHIDARE</p>
              <h3 className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-3 drop-shadow-md">
                {restDePlata.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-3xl font-normal opacity-80">{settings.currency}</span>
              </h3>
              <p className="text-xs mt-3 text-white/50 font-medium">*Estimare bazată pe tariful orar și orele introduse.</p>
            </div>
          </div>

          {/* ZONA 1: BAZA */}
          <div className="card-v6 relative overflow-hidden rounded-[30px] p-6 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <label className="block text-sm font-bold text-white uppercase tracking-wider opacity-90">
                Salariu Net Negociat
              </label>
              <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold text-white backdrop-blur-sm">LUNAR</span>
            </div>

            <div className="relative mb-8 z-10 flex items-center justify-between">
              <input
                type="number"
                value={salaryNet || ''}
                onChange={handleSalaryChange}
                placeholder="0"
                className="w-2/3 text-5xl font-black bg-transparent border-none outline-none p-0 placeholder-white/30 text-white"
              />
              <span className="text-2xl font-bold text-white opacity-80">{settings.currency}</span>
            </div>

            <div className="flex justify-between items-end text-xs pt-4 border-t border-white/20 relative z-10">
              <div>
                <span className="block text-white/70 mb-1">Norma Standard</span>
                <span className="font-bold text-white text-sm">{standardWorkingDays} zile lucrătoare</span>
              </div>
              <div className="text-right">
                <span className="block text-white/70 mb-1">Tarif Orar</span>
                <div className="bg-white/20 px-3 py-1.5 rounded-lg font-bold font-mono text-white inline-block backdrop-blur-md">
                  {hourlyRate.toFixed(2)} {settings.currency}/h
                </div>
              </div>
            </div>
          </div>

          {/* ZONA 2: PONTAJ */}
          <div className="card-v6 relative overflow-hidden rounded-[30px] p-6 transition-all duration-300">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-2 bg-white/20 rounded-full border border-white/20 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wider text-shadow-sm">Pontaj Ore (Cantități)</span>
            </div>

            <div className="space-y-5 relative z-10">
              {/* Ore Normale */}
              <div className="flex items-center justify-between">
                <label className="text-base font-bold text-white text-shadow-sm">Ore Normale</label>
                <div className="relative">
                  <input
                    type="number"
                    value={hours.normal}
                    onChange={(e) => handleHoursChange('normal', e.target.value)}
                    className="w-28 text-center rounded-xl p-3 font-bold text-xl outline-none transition-all bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/50 dark:bg-white/10 dark:border-none dark:text-white dark:placeholder-white/50 dark:backdrop-blur-md dark:focus:bg-white/20"
                  />
                </div>
              </div>

              {/* Ore Noapte */}
              <div className="flex items-center justify-between">
                <label className="text-base font-bold text-white text-shadow-sm">Ore Noapte</label>
                <div className="relative">
                  <input
                    type="number"
                    value={hours.night}
                    onChange={(e) => handleHoursChange('night', e.target.value)}
                    className="w-28 text-center rounded-xl p-3 font-bold text-xl outline-none transition-all bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/50 dark:bg-white/10 dark:border-none dark:text-white dark:placeholder-white/50 dark:backdrop-blur-md dark:focus:bg-white/20"
                  />
                </div>
              </div>

              {/* Ore Suplimentare */}
              <div className="flex items-center justify-between">
                <label className="text-base font-bold text-white text-shadow-sm">Ore Suplimentare</label>
                <div className="relative">
                  <input
                    type="number"
                    value={hours.overtime}
                    onChange={(e) => handleHoursChange('overtime', e.target.value)}
                    className="w-28 text-center rounded-xl p-3 font-bold text-xl outline-none transition-all bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/50 dark:bg-white/10 dark:border-none dark:text-white dark:placeholder-white/50 dark:backdrop-blur-md dark:focus:bg-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};