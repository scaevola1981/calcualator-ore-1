import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Moon,
  Zap,
  Ticket,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import type { AppSettings, WorkSession } from '../types';
import { getLocalISODate } from '../utils/dateUtils';
import { calculateDurationWithBreak, calculateNightHours } from '../utils/timeRounding';
import { calculatePayroll, PayrollInputs, PayrollBreakdown } from '../utils/payrollCalculator';
import { parsePayslipText } from '../utils/payslipParser';

interface CalculatorPageProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  workSessions?: WorkSession[];
  referenceDate?: Date;
}

// Zile lucrătoare L-V excluzând sărbătorile legale
const getWorkingDaysInMonth = (year: number, month: number, holidays: string[] = []): number => {
  if (year < 2000 || year > 2100 || month < 0 || month > 11) return 21;

  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) break;

    const dayOfWeek = date.getDay();
    const dateString = getLocalISODate(date);
    const isHoliday = holidays.includes(dateString);

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
      count++;
    }
  }
  return count > 0 ? count : 21;
};

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  settings,
  onSettingsChange: _onSettingsChange,
  workSessions = [],
  referenceDate,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'audit'>('simulator');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const refDate = useMemo(() => {
    return referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  }, [referenceDate]);

  // Luna selectată pentru calcul și pontaj (default luna curentă)
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const targetDate = useMemo(() => {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() + selectedMonthOffset, 1);
    return d;
  }, [refDate, selectedMonthOffset]);

  const currentMonth = targetDate.getMonth();
  const currentYear = targetDate.getFullYear();

  const standardWorkingDays = useMemo(() => {
    return getWorkingDaysInMonth(currentYear, currentMonth, settings.legalHolidays);
  }, [currentYear, currentMonth, settings.legalHolidays]);

  // Calcul exact din sesiunile reale ale lunii selectate
  const recordedStats = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    let normalH = 0;
    let overtimeH = 0;
    let nightH = 0;
    const ticketDays = new Set<string>();

    const dailyMap: { [dateStr: string]: { duration: number; isWeekendOrHoliday: boolean } } = {};

    workSessions.forEach(session => {
      const sStart = new Date(session.startTime);
      const sEnd = new Date(session.endTime);
      if (sStart >= startOfMonth && sStart <= endOfMonth) {
        const dStr = getLocalISODate(sStart);
        const dayOfWeek = sStart.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = (settings.legalHolidays || []).includes(dStr);

        const duration = calculateDurationWithBreak(sStart, sEnd);
        nightH += calculateNightHours(sStart, sEnd);

        if (!dailyMap[dStr]) {
          dailyMap[dStr] = { duration: 0, isWeekendOrHoliday: isWeekend || isHoliday };
        }
        dailyMap[dStr].duration += duration;
      }
    });

    Object.entries(dailyMap).forEach(([dStr, { duration, isWeekendOrHoliday }]) => {
      if (isWeekendOrHoliday) {
        overtimeH += duration > 0.5 ? duration - 0.5 : duration;
      } else {
        if (duration > 0) ticketDays.add(dStr);
        const limit = settings.normalHoursLimit || 8;
        const norm = Math.min(duration, limit);
        const rawOvt = Math.max(0, duration - limit);
        const ovt = rawOvt > 0 ? Math.max(0, rawOvt - 0.5) : 0;
        normalH += norm;
        overtimeH += ovt;
      }
    });

    return {
      normalHours: Number(normalH.toFixed(1)),
      overtimeHours: Number(overtimeH.toFixed(1)),
      nightHours: Number(nightH.toFixed(1)),
      ticketDaysCount: ticketDays.size,
    };
  }, [workSessions, currentYear, currentMonth, settings.legalHolidays, settings.normalHoursLimit]);

  // STARE PENTRU SIMULATOR
  const [simInputs, setSimInputs] = useState<PayrollInputs>({
    grossBaseSalary: settings.grossSalary || 7180,
    workingDaysInMonth: standardWorkingDays,
    normalHours: recordedStats.normalHours > 0 ? recordedStats.normalHours : (standardWorkingDays * 8),
    nightHours: recordedStats.nightHours,
    overtimeHours: recordedStats.overtimeHours,
    vacationDays: 0,
    weekendBonusPercent: 1, // 1% spor weekend
    primaOS: 0,
    mealTicketsCount: recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : standardWorkingDays,
    mealTicketValue: settings.mealTicketValue || 22,
    advancePayment: settings.standardAdvance || 1500,
  });

  // Re-sincronizează la schimbarea lunii sau a setărilor
  useEffect(() => {
    const monthCODays = (settings.specialDays || []).filter(sd => {
      const [y, m] = sd.date.split('-').map(Number);
      return y === currentYear && m === (currentMonth + 1) && sd.type === 'CO';
    }).length;

    setSimInputs(prev => ({
      ...prev,
      grossBaseSalary: settings.grossSalary || 7180,
      workingDaysInMonth: standardWorkingDays,
      normalHours: recordedStats.normalHours > 0 ? recordedStats.normalHours : (standardWorkingDays * 8),
      nightHours: recordedStats.nightHours,
      overtimeHours: recordedStats.overtimeHours,
      vacationDays: monthCODays,
      mealTicketsCount: recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : Math.max(0, standardWorkingDays - monthCODays),
      mealTicketValue: settings.mealTicketValue || 22,
      advancePayment: settings.standardAdvance || 1500,
    }));
  }, [recordedStats, standardWorkingDays, settings.grossSalary, settings.mealTicketValue, settings.standardAdvance, settings.specialDays, currentYear, currentMonth]);

  // Calcul rezultat Simulator
  const simResult: PayrollBreakdown = useMemo(() => {
    return calculatePayroll(simInputs);
  }, [simInputs]);

  // STARE PENTRU MODUL AUDIT FLUTURAȘ (Se populează din OCR sau introducere manuală)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [fluturasInputs, setFluturasInputs] = useState({
    normalHours: 0,
    nightHours: 0,
    overtimeHours: 0,  // Ore declarate pe fluturaș (la 200%)
    vacationDays: 0,   // Zile Concediu Odihnă (CO)
    primaOS: 0,        // Primă ore suplimentare (Prima OS)
    mealTicketsCount: 0,
    grossTotal: 0,
    netSalary: 0,
    restDePlata: 0,
  });

  // Încărcare foto fluturaș & OCR
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsOcrProcessing(true);
    setOcrProgress(10);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('ron');
      setOcrProgress(40);

      const ret = await worker.recognize(file);
      setOcrProgress(80);
      const text = ret.data.text;
      await worker.terminate();

      // Parsare automată date fluturaș
      const parsed = parsePayslipText(text);
      setFluturasInputs(prev => ({
        normalHours: parsed.normalHours ?? prev.normalHours,
        nightHours: parsed.nightHours ?? prev.nightHours,
        overtimeHours: parsed.overtimeHours ?? prev.overtimeHours,
        vacationDays: parsed.vacationDays ?? prev.vacationDays,
        primaOS: parsed.primaOS ?? prev.primaOS,
        mealTicketsCount: parsed.mealTicketsCount ?? prev.mealTicketsCount,
        grossTotal: parsed.grossTotal ?? prev.grossTotal,
        netSalary: parsed.netSalary ?? prev.netSalary,
        restDePlata: parsed.restDePlata ?? prev.restDePlata,
      }));
    } catch (err) {
      console.warn('Eroare OCR fluturaș:', err);
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(100);
    }
  };

  // AUDIT: Calcule diferențe cap-la-cap (Pontaj Real vs Fluturaș)
  const auditDiffs = useMemo(() => {
    const hasFluturasData =
      fluturasInputs.normalHours > 0 ||
      fluturasInputs.overtimeHours > 0 ||
      fluturasInputs.nightHours > 0 ||
      fluturasInputs.grossTotal > 0 ||
      fluturasInputs.restDePlata > 0;

    // Dacă nu există pontaj înregistrat pentru luna respectivă,
    // orele de regie așteptate = (Zile lucrătoare din lună - Zile CO) * 8h
    const expectedNormalHours = Math.max(0, (standardWorkingDays - (fluturasInputs.vacationDays || 0)) * 8);
    const appNormal = recordedStats.normalHours > 0 ? recordedStats.normalHours : expectedNormalHours;
    const appOvertime = recordedStats.overtimeHours;
    const appNight = recordedStats.nightHours;
    const expectedTickets = Math.max(0, standardWorkingDays - (fluturasInputs.vacationDays || 0));
    const appTickets = recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : expectedTickets;

    const diffNormal = Number((fluturasInputs.normalHours - appNormal).toFixed(1));

    // Regula Fabricii: Orele de pe fluturaș la 200% = jumătate din orele reale (1h la 200% = 2h reale)
    // Dacă în aplicație s-au pontat ore reale (ex: 56h), iar pe fluturaș sunt 28h la 200%, ele sunt 100% egale!
    const fluturasRealEquivalent = fluturasInputs.overtimeHours * 2;
    let diffOvertime = 0;
    let isOvertimeMatched = false;

    if (appOvertime === 0) {
      // Dacă nu există pontaj salvat pe luna aceasta, considerăm orele de pe fluturaș ca bază de verificare
      diffOvertime = 0;
      isOvertimeMatched = true;
    } else if (Math.abs(fluturasRealEquivalent - appOvertime) < 0.5) {
      // Aplicația are ore reale (ex: 56h), fluturașul are 28h la 200% -> ECHIVALENTE
      diffOvertime = 0;
      isOvertimeMatched = true;
    } else if (Math.abs(fluturasInputs.overtimeHours - appOvertime) < 0.5) {
      // Utilizatorul a pontat direct cota declarată (28h)
      diffOvertime = 0;
      isOvertimeMatched = true;
    } else {
      // Discrepanță față de orele reale
      diffOvertime = Number((fluturasRealEquivalent - appOvertime).toFixed(1));
    }

    const diffNight = appNight > 0 ? Number((fluturasInputs.nightHours - appNight).toFixed(1)) : 0;
    const diffTickets = fluturasInputs.mealTicketsCount > 0 ? fluturasInputs.mealTicketsCount - appTickets : 0;

    // Calcul valoare financiară a diferenței de ore suplimentare
    const netHourlyOvertime = ((settings.grossSalary || 7180) / (standardWorkingDays * 8)) * 0.58;
    const lostOvertimeMoney = diffOvertime < 0 ? Math.round(Math.abs(diffOvertime) * netHourlyOvertime) : 0;
    const gainedOvertimeMoney = diffOvertime > 0 ? Math.round(diffOvertime * netHourlyOvertime) : 0;

    // Reconciliere Rest de Plată: recalculăm fluturașul conform legii și verificăm dacă suma coincide
    const calculatedFromFluturas = calculatePayroll({
      grossBaseSalary: settings.grossSalary || 7180,
      workingDaysInMonth: standardWorkingDays,
      normalHours: fluturasInputs.normalHours > 0 ? fluturasInputs.normalHours : appNormal,
      nightHours: fluturasInputs.nightHours,
      overtimeHours: fluturasInputs.overtimeHours,
      vacationDays: fluturasInputs.vacationDays,
      weekendBonusPercent: 1,
      primaOS: fluturasInputs.primaOS,
      mealTicketsCount: fluturasInputs.mealTicketsCount > 0 ? fluturasInputs.mealTicketsCount : appTickets,
      mealTicketValue: settings.mealTicketValue || 22,
      advancePayment: settings.standardAdvance || 1500,
    });

    const diffRestPlata = fluturasInputs.restDePlata > 0 ? fluturasInputs.restDePlata - calculatedFromFluturas.restDePlata : 0;

    const isAllMatched =
      hasFluturasData &&
      Math.abs(diffNormal) < 0.5 &&
      isOvertimeMatched &&
      Math.abs(diffNight) < 0.5 &&
      Math.abs(diffTickets) === 0 &&
      Math.abs(diffRestPlata) <= 2; // toleranță de rotunjire de max 2 lei

    return {
      hasFluturasData,
      appNormal,
      appOvertime,
      appNight,
      appTickets,
      diffNormal,
      diffOvertime,
      diffNight,
      diffTickets,
      fluturasRealEquivalent,
      lostOvertimeMoney,
      gainedOvertimeMoney,
      calculatedRestPlata: calculatedFromFluturas.restDePlata,
      diffRestPlata,
      isAllMatched,
    };
  }, [recordedStats, standardWorkingDays, fluturasInputs, settings]);

  return (
    <div className="space-y-6 animate-fade-in pb-36">
      {/* HEADER NEO-SKEUOMORPHIC */}
      <header className="px-6 header-safe-top pb-6 nm-card !rounded-t-none !rounded-b-[32px] border-t-0 -mx-1 relative z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--nm-text)] tracking-tight flex items-center gap-2">
              Calculator & Fluturaș ⚖️
            </h1>
            <div className="nm-inset px-3 py-1 mt-2 inline-flex items-center gap-2">
              <span className="nm-led nm-led-indigo"></span>
              <p className="text-xs font-bold text-[var(--nm-text-muted)]">
                Simulator Salariu & Audit Cap-la-Cap • Avicarvil
              </p>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="nm-inset p-1.5 rounded-2xl flex relative w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'nm-card-sm text-sky-600 dark:text-sky-400 font-black scale-100 shadow-sm'
                  : 'text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]'
              }`}
            >
              <DollarSign size={16} />
              <span>Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'nm-card-sm text-emerald-600 dark:text-emerald-400 font-black scale-100 shadow-sm'
                  : 'text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]'
              }`}
            >
              <FileText size={16} />
              <span>Audit Fluturaș</span>
            </button>
          </div>
        </div>
      </header>

      {/* SELECTOR LUNĂ PENTRU SIMULARE / AUDIT */}
      <div className="px-5">
        <div className="flex items-center justify-between nm-card p-3 rounded-2xl">
          <button
            onClick={() => setSelectedMonthOffset(prev => prev - 1)}
            className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)]"
            title="Luna precedentă"
          >
            ←
          </button>
          <div className="nm-inset-sm px-4 py-1 text-center">
            <span className="text-[10px] text-[var(--nm-text-muted)] block uppercase font-bold tracking-wider">
              Luna de referință
            </span>
            <span className="text-sm font-black text-[var(--nm-text)] capitalize">
              {targetDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => setSelectedMonthOffset(prev => (prev < 0 ? prev + 1 : 0))}
            disabled={selectedMonthOffset >= 0}
            className={`nm-btn-round !w-9 !h-9 text-[var(--nm-text)] ${
              selectedMonthOffset >= 0 ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Luna următoare"
          >
            →
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: SIMULATOR SALARIU ===================== */}
      {activeTab === 'simulator' && (
        <div className="px-5 space-y-5">
          {/* CARDS MARI REZULTAT */}
          <div className="nm-card p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div className="nm-inset-sm px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Rest de Plată (Lichidare pe Card)
              </div>
              <div className="nm-inset-sm px-2.5 py-1 text-[10px] font-black uppercase text-[var(--nm-text-muted)]">
                După Avans
              </div>
            </div>

            <div className="nm-inset p-4 my-3 rounded-2xl text-center">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {simResult.restDePlata.toLocaleString('ro-RO')}
              </span>
              <span className="text-xl font-bold ml-2 text-emerald-600 dark:text-emerald-400">RON</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--nm-border)] text-xs">
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] block font-bold uppercase">Salariu Net Total:</span>
                <span className="text-base font-black font-mono text-[var(--nm-text)]">{simResult.netSalary.toLocaleString('ro-RO')} RON</span>
              </div>
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] block font-bold uppercase">Venit Brut Total:</span>
                <span className="text-base font-black font-mono text-[var(--nm-text)]">{simResult.grossTotal.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
          </div>

          {/* CONTROALE ORE ȘI SLIDERE */}
          <div className="nm-card p-5 space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--nm-border)]">
              <h3 className="text-xs font-black text-[var(--nm-text)] uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Ore Lucrate în Lună
              </h3>
              <button
                onClick={() => {
                  setSimInputs(prev => ({
                    ...prev,
                    normalHours: recordedStats.normalHours > 0 ? recordedStats.normalHours : standardWorkingDays * 8,
                    nightHours: recordedStats.nightHours,
                    overtimeHours: recordedStats.overtimeHours,
                    mealTicketsCount: recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : standardWorkingDays,
                  }));
                }}
                className="nm-btn px-2.5 py-1 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 active:scale-95"
                title="Resetează la valorile reale înregistrate de aplicație"
              >
                <RefreshCw size={12} />
                Resetează la pontaj
              </button>
            </div>

            {/* 1. Ore Regie / Normale */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Ore Normale (Regie)
                </label>
                <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                  {simInputs.normalHours}h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={simInputs.normalHours}
                onChange={e => setSimInputs({ ...simInputs, normalHours: parseFloat(e.target.value) || 0 })}
                className="w-full accent-blue-600"
              />
            </div>

            {/* 2. Ore Suplimentare (200%) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Zap size={14} className="text-purple-500" />
                  Ore Suplimentare (Plătite 200%)
                </label>
                <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400">
                  {simInputs.overtimeHours}h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={simInputs.overtimeHours}
                onChange={e => setSimInputs({ ...simInputs, overtimeHours: parseFloat(e.target.value) || 0 })}
                className="w-full accent-purple-600"
              />
            </div>

            {/* 3. Ore de Noapte (25%) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Moon size={14} className="text-indigo-500" />
                  Ore de Noapte (22:00 - 06:00, Spor 25%)
                </label>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {simInputs.nightHours}h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={simInputs.nightHours}
                onChange={e => setSimInputs({ ...simInputs, nightHours: parseFloat(e.target.value) || 0 })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* 4. Concediu de Odihnă (CO) & Tichete */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--nm-text)] block mb-1">
                  Zile Concediu (CO)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimInputs(prev => ({ ...prev, vacationDays: Math.max(0, prev.vacationDays - 1) }))}
                    className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)] font-bold text-lg shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={simInputs.vacationDays === 0 ? '' : simInputs.vacationDays}
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      setSimInputs({ ...simInputs, vacationDays: val === '' ? 0 : Math.max(0, parseInt(val) || 0) });
                    }}
                    className="w-full text-center nm-inset p-2 font-mono text-sm font-bold text-[var(--nm-text)] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setSimInputs(prev => ({ ...prev, vacationDays: Math.min(25, prev.vacationDays + 1) }))}
                    className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)] font-bold text-lg shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--nm-text)] block mb-1 flex items-center gap-1">
                  <Ticket size={14} className="text-teal-500" />
                  Tichete ({simInputs.mealTicketValue} lei)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimInputs(prev => ({ ...prev, mealTicketsCount: Math.max(0, prev.mealTicketsCount - 1) }))}
                    className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)] font-bold text-lg shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={simInputs.mealTicketsCount === 0 ? '' : simInputs.mealTicketsCount}
                    placeholder="0"
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      setSimInputs({ ...simInputs, mealTicketsCount: val === '' ? 0 : Math.max(0, parseInt(val) || 0) });
                    }}
                    className="w-full text-center nm-inset p-2 font-mono text-sm font-bold text-[var(--nm-text)] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setSimInputs(prev => ({ ...prev, mealTicketsCount: Math.min(31, prev.mealTicketsCount + 1) }))}
                    className="nm-btn-round !w-9 !h-9 text-[var(--nm-text)] font-bold text-lg shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Primă Ore Suplimentare (Prima OS) */}
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[var(--nm-text)]">
                  Primă Ore Suplimentare (Prima OS - RON)
                </label>
                <span className="text-[11px] text-[var(--nm-text-muted)]">opțional</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={simInputs.primaOS === 0 ? '' : simInputs.primaOS}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    setSimInputs({ ...simInputs, primaOS: val === '' ? 0 : Math.max(0, parseFloat(val) || 0) });
                  }}
                  className="w-full nm-inset p-2.5 font-mono text-sm font-bold text-[var(--nm-text)] rounded-xl"
                />
                {simInputs.primaOS > 0 && (
                  <button
                    type="button"
                    onClick={() => setSimInputs(prev => ({ ...prev, primaOS: 0 }))}
                    className="nm-btn px-3 py-2.5 text-xs font-bold text-[var(--nm-text)] rounded-xl whitespace-nowrap active:scale-95"
                  >
                    Reset 0
                  </button>
                )}
              </div>
            </div>

            {/* 6. Avans Salariu Reținut */}
            <div className="pt-1">
              <label className="text-xs font-bold text-[var(--nm-text)] block mb-1">
                Avans Reținut (RON)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={simInputs.advancePayment === 0 ? '' : simInputs.advancePayment}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const val = e.target.value;
                    setSimInputs({ ...simInputs, advancePayment: val === '' ? 0 : Math.max(0, parseFloat(val) || 0) });
                  }}
                  className="w-full nm-inset p-2.5 font-mono text-sm font-bold text-[var(--nm-text)] rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setSimInputs(prev => ({ ...prev, advancePayment: 1500 }))}
                  className="nm-btn px-3 py-2.5 text-xs font-bold text-[var(--nm-text)] rounded-xl whitespace-nowrap active:scale-95"
                >
                  Standard 1500
                </button>
              </div>
            </div>
          </div>

          {/* ACORDEON DETALIERE FLUTURAȘ */}
          <div className="nm-card p-5 space-y-3">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full flex justify-between items-center text-left"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                <span className="text-sm font-black text-[var(--nm-text)]">
                  Desfășurător Fluturaș (Drepturi, Taxe & Rețineri)
                </span>
              </div>
              <div className="nm-btn-round !w-8 !h-8 text-[var(--nm-text)]">
                {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showAdvancedSettings && (
              <div className="mt-4 pt-4 border-t border-[var(--nm-border)] space-y-3 text-xs">
                <div className="nm-inset-sm p-3 flex justify-between items-center">
                  <span className="text-[var(--nm-text-muted)] font-medium">Tarif orar de bază ({simInputs.grossBaseSalary} lei / {simInputs.workingDaysInMonth * 8}h):</span>
                  <span className="font-mono font-black text-[var(--nm-text)]">{simResult.hourlyRate} RON/h</span>
                </div>

                {/* Drepturi */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black text-[var(--nm-text-muted)] uppercase tracking-wider block">1. Drepturi Salariale (Brut)</span>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Ore normale ({simInputs.normalHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.normalIncome.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Ore suplimentare 200% ({simInputs.overtimeHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.overtimeIncome.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Spor noapte 25% ({simInputs.nightHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.nightBonus.toLocaleString('ro-RO')} RON</span>
                  </div>
                  {simResult.vacationIncome > 0 && (
                    <div className="flex justify-between text-[var(--nm-text)]">
                      <span>Concediu odihnă ({simInputs.vacationDays} zile):</span>
                      <span className="font-mono font-semibold">{simResult.vacationIncome.toLocaleString('ro-RO')} RON</span>
                    </div>
                  )}
                  {simResult.primaOS > 0 && (
                    <div className="flex justify-between text-[var(--nm-text)]">
                      <span>Primă ore suplimentare (Prima OS):</span>
                      <span className="font-mono font-semibold">{simResult.primaOS.toLocaleString('ro-RO')} RON</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Spor ore weekend (1%):</span>
                    <span className="font-mono font-semibold">{simResult.weekendBonus} RON</span>
                  </div>
                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-medium">
                    <span>Tichete de masă ({simInputs.mealTicketsCount} buc):</span>
                    <span className="font-mono font-bold">{simResult.mealTicketsTotal} RON</span>
                  </div>
                  <div className="flex justify-between font-black text-[var(--nm-text)] pt-1 border-t border-dashed border-[var(--nm-border)]">
                    <span>TOTAL VENIT BRUT:</span>
                    <span className="font-mono">{simResult.grossTotal.toLocaleString('ro-RO')} RON</span>
                  </div>
                </div>

                {/* Taxe */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--nm-border)]">
                  <span className="text-[11px] font-black text-[var(--nm-text-muted)] uppercase tracking-wider block">2. Taxe & Impozite</span>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>CASS Sănătate (10%):</span>
                    <span className="font-mono text-rose-500 font-semibold">- {simResult.cass.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>CAS Pensii (25% fără tichete):</span>
                    <span className="font-mono text-rose-500 font-semibold">- {simResult.cas.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Impozit pe venit (10%):</span>
                    <span className="font-mono text-rose-500 font-semibold">- {simResult.incomeTax.toLocaleString('ro-RO')} RON</span>
                  </div>
                </div>

                {/* Rețineri */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--nm-border)]">
                  <span className="text-[11px] font-black text-[var(--nm-text-muted)] uppercase tracking-wider block">3. Rețineri pe Card</span>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Contravaloare tichete (deja pe cardul de tichete):</span>
                    <span className="font-mono text-amber-500 font-semibold">- {simResult.mealTicketsTotal} RON</span>
                  </div>
                  <div className="flex justify-between text-[var(--nm-text)]">
                    <span>Avans virat anterior:</span>
                    <span className="font-mono text-amber-500 font-semibold">- {simResult.advancePayment.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="nm-inset p-3 rounded-2xl flex justify-between font-black text-emerald-600 dark:text-emerald-400 text-sm mt-2">
                    <span>REST DE PLATĂ FINAL:</span>
                    <span className="font-mono">{simResult.restDePlata.toLocaleString('ro-RO')} RON</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ÎNCARCĂ FLUTURAȘ & AUDIT ===================== */}
      {activeTab === 'audit' && (
        <div className="px-5 space-y-5">
          {/* SECȚIUNE UPLOAD FOTO FLUTURAȘ */}
          <div className="nm-card p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl nm-inset text-blue-500 flex items-center justify-center mx-auto shadow-inner">
              <Camera size={26} />
            </div>
            <div>
              <h3 className="text-base font-black text-[var(--nm-text)]">
                Încarcă sau Fotografiază Fluturașul
              </h3>
              <p className="text-xs text-[var(--nm-text-muted)] mt-1 max-w-xs mx-auto">
                Facem automat citirea cifrelor prin OCR și le comparăm cu pontajul tău real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              {/* Opțiunea 1: Alege din Galerie / Poze */}
              <label className="w-full sm:w-auto nm-power-btn-start !py-3.5 !px-5 !rounded-2xl text-xs sm:text-sm font-black text-white inline-flex items-center justify-center gap-2 cursor-pointer shadow-md">
                <Upload size={16} />
                <span>{uploadedImage ? 'Alege altă Poză din Galerie' : 'Alege din Poze / Galerie'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Opțiunea 2: Fă Poză cu Camera */}
              <label className="w-full sm:w-auto nm-btn !py-3.5 !px-5 !rounded-2xl text-xs sm:text-sm font-black text-[var(--nm-text)] inline-flex items-center justify-center gap-2 cursor-pointer">
                <Camera size={16} className="text-blue-500" />
                <span>Fă Poză cu Camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {isOcrProcessing && (
              <div className="mt-4 p-4 nm-inset rounded-2xl text-xs font-bold text-blue-500">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Se analizează fluturașul... ({ocrProgress}%)</span>
                </div>
                <div className="w-full bg-[var(--nm-bg)] rounded-full h-2 overflow-hidden p-0.5">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* VERDICTUL DE AUDIT */}
          {!auditDiffs.hasFluturasData ? (
            <div className="nm-card p-5 border-l-4 border-l-blue-500">
              <div className="flex items-start gap-3">
                <div className="nm-inset-sm p-2 text-blue-500 shrink-0 mt-0.5">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[var(--nm-text)] tracking-tight">
                    Audit Fluturaș • {targetDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                  </h4>
                  <p className="text-xs text-[var(--nm-text-muted)] mt-1 leading-relaxed">
                    Încarcă o poză cu fluturașul tău sau completează cifrele în coloana „Pe Fluturaș” de mai jos pentru reconciliere automată cu orele din această lună.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`nm-card p-5 border-l-4 ${
                auditDiffs.isAllMatched ? 'border-l-emerald-500' : 'border-l-rose-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`nm-inset-sm p-2 shrink-0 mt-0.5 ${auditDiffs.isAllMatched ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {auditDiffs.isAllMatched ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-black tracking-tight ${auditDiffs.isAllMatched ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {auditDiffs.isAllMatched
                      ? '🟢 Fluturașul este 100% Corect!'
                      : '🔴 Discrepanțe Identificate în Fluturaș!'}
                  </h4>
                  <p className="text-xs text-[var(--nm-text-muted)] mt-1 leading-relaxed">
                    {auditDiffs.isAllMatched
                      ? 'Orele de regie, suplimentare și de noapte trecute pe fluturaș corespund cu înregistrările tale din aplicație și calculul legal.'
                      : auditDiffs.diffOvertime < 0
                      ? `Fabrica ți-a trecut cu ${Math.abs(auditDiffs.diffOvertime)} ore suplimentare reale mai puțin! Pierdere estimată: ~${auditDiffs.lostOvertimeMoney} RON net.`
                      : `Există diferențe între pontajul tău și cifrele de pe fluturaș. Verifică tabelul comparativ de mai jos.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TABEL COMPARATIV CAP-LA-CAP */}
          <div className="nm-card p-5 space-y-4">
            <h3 className="text-xs font-black text-[var(--nm-text)] uppercase tracking-wider pb-2 border-b border-[var(--nm-border)]">
              Reconciliere Cap-la-Cap (Pontaj vs Fluturaș)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[var(--nm-text-muted)] font-black border-b border-[var(--nm-border)]">
                    <th className="pb-2.5">Rubrică</th>
                    <th className="pb-2.5 text-center">În Aplicație</th>
                    <th className="pb-2.5 text-center">Pe Fluturaș</th>
                    <th className="pb-2.5 text-right">Diferență</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nm-border)] font-mono">
                  {/* 1. Ore Regie */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">Ore Normale (Regie)</td>
                    <td className="text-center font-black text-blue-500">{auditDiffs.appNormal}h</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.normalHours === 0 ? '' : fluturasInputs.normalHours}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, normalHours: val === '' ? 0 : parseFloat(val) || 0 });
                        }}
                        className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className={`text-right font-black ${auditDiffs.diffNormal === 0 ? 'text-[var(--nm-text-muted)]' : auditDiffs.diffNormal < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffNormal > 0 ? `+${auditDiffs.diffNormal}h` : `${auditDiffs.diffNormal}h`}
                    </td>
                  </tr>

                  {/* 2. Concediu Odihnă (CO) */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">Concediu Odihnă (CO)</td>
                    <td className="text-center font-black text-[var(--nm-text-muted)]">
                      {fluturasInputs.vacationDays}z ({fluturasInputs.vacationDays * 8}h)
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={fluturasInputs.vacationDays === 0 ? '' : fluturasInputs.vacationDays}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, vacationDays: val === '' ? 0 : parseInt(val) || 0 });
                        }}
                        className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className="text-right font-black text-[var(--nm-text-muted)]">
                      0 zile
                    </td>
                  </tr>

                  {/* 3. Ore Suplimentare (200% vs Reale) */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">
                      <div>Ore Suplimentare</div>
                      <div className="text-[10px] text-[var(--nm-text-muted)] font-normal">Plată 200% (1:2)</div>
                    </td>
                    <td className="text-center font-black text-purple-500">
                      {auditDiffs.appOvertime > 0 ? `${auditDiffs.appOvertime}h` : `${auditDiffs.fluturasRealEquivalent}h echiv.`}
                    </td>
                    <td className="text-center">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          value={fluturasInputs.overtimeHours === 0 ? '' : fluturasInputs.overtimeHours}
                          placeholder="0"
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = e.target.value;
                            setFluturasInputs({ ...fluturasInputs, overtimeHours: val === '' ? 0 : parseFloat(val) || 0 });
                          }}
                          className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                        />
                        <span className="text-[10px] text-purple-500 font-bold mt-0.5">
                          = {fluturasInputs.overtimeHours * 2}h
                        </span>
                      </div>
                    </td>
                    <td className={`text-right font-black ${auditDiffs.diffOvertime === 0 ? 'text-emerald-500' : auditDiffs.diffOvertime < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffOvertime === 0 ? '0h (OK)' : auditDiffs.diffOvertime > 0 ? `+${auditDiffs.diffOvertime}h` : `${auditDiffs.diffOvertime}h`}
                    </td>
                  </tr>

                  {/* 4. Primă OS */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">Primă OS</td>
                    <td className="text-center font-black text-[var(--nm-text-muted)]">
                      {fluturasInputs.primaOS} lei
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.primaOS === 0 ? '' : fluturasInputs.primaOS}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, primaOS: val === '' ? 0 : parseFloat(val) || 0 });
                        }}
                        className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className="text-right font-black text-emerald-500">
                      0 lei
                    </td>
                  </tr>

                  {/* 5. Ore de Noapte */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">Ore Noapte (25%)</td>
                    <td className="text-center font-black text-indigo-500">
                      {auditDiffs.appNight > 0 ? `${auditDiffs.appNight}h` : `${fluturasInputs.nightHours}h`}
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.nightHours === 0 ? '' : fluturasInputs.nightHours}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, nightHours: val === '' ? 0 : parseFloat(val) || 0 });
                        }}
                        className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className={`text-right font-black ${auditDiffs.diffNight === 0 ? 'text-[var(--nm-text-muted)]' : auditDiffs.diffNight < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffNight > 0 ? `+${auditDiffs.diffNight}h` : `${auditDiffs.diffNight}h`}
                    </td>
                  </tr>

                  {/* 6. Tichete Masă */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">Tichete Masă</td>
                    <td className="text-center font-black text-teal-500">{auditDiffs.appTickets}</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.mealTicketsCount === 0 ? '' : fluturasInputs.mealTicketsCount}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, mealTicketsCount: val === '' ? 0 : parseInt(val) || 0 });
                        }}
                        className="w-16 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className={`text-right font-black ${auditDiffs.diffTickets === 0 ? 'text-[var(--nm-text-muted)]' : auditDiffs.diffTickets < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffTickets > 0 ? `+${auditDiffs.diffTickets}` : `${auditDiffs.diffTickets}`}
                    </td>
                  </tr>

                  {/* 7. Rest de Plată */}
                  <tr>
                    <td className="py-3 font-sans font-semibold text-[var(--nm-text)]">
                      <div>Rest Plată (Lichidare)</div>
                      <div className="text-[10px] text-[var(--nm-text-muted)] font-normal">Calculat vs Fluturaș</div>
                    </td>
                    <td className="text-center font-black text-emerald-500">
                      {auditDiffs.calculatedRestPlata.toLocaleString('ro-RO')} lei
                    </td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.restDePlata === 0 ? '' : fluturasInputs.restDePlata}
                        placeholder="0"
                        onFocus={e => e.target.select()}
                        onChange={e => {
                          const val = e.target.value;
                          setFluturasInputs({ ...fluturasInputs, restDePlata: val === '' ? 0 : parseFloat(val) || 0 });
                        }}
                        className="w-20 nm-inset-sm p-1.5 text-center text-xs font-bold text-[var(--nm-text)] rounded-lg"
                      />
                    </td>
                    <td className={`text-right font-black ${auditDiffs.diffRestPlata === 0 || Math.abs(auditDiffs.diffRestPlata) <= 2 ? 'text-emerald-500' : auditDiffs.diffRestPlata < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffRestPlata === 0 ? '0 lei (Match!)' : auditDiffs.diffRestPlata > 0 ? `+${auditDiffs.diffRestPlata} lei` : `${auditDiffs.diffRestPlata} lei`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-[var(--nm-text-muted)] pt-2 italic">
              * Poți ajusta direct cifrele din coloana „Pe Fluturaș” dacă poza a fost parțial neclară.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};