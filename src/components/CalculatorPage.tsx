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
  RefreshCw,
  Info,
  Calendar
} from 'lucide-react';
import type { AppSettings, WorkSession } from '../types';
import { getLocalISODate } from '../utils/dateUtils';
import { calculateDurationWithBreak, calculateNightHours } from '../utils/timeRounding';
import { calculatePayroll, PayrollInputs, PayrollBreakdown } from '../utils/payrollCalculator';
import { parsePayslipText, ExtractedPayslipData } from '../utils/payslipParser';

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
  onSettingsChange,
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

        if (isWeekend || isHoliday) {
          overtimeH += duration;
        } else {
          if (duration > 0) ticketDays.add(dStr);
          if (duration <= (settings.normalHoursLimit || 8)) {
            normalH += duration;
          } else {
            normalH += settings.normalHoursLimit || 8;
            overtimeH += duration - (settings.normalHoursLimit || 8);
          }
        }
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
    setSimInputs(prev => ({
      ...prev,
      grossBaseSalary: settings.grossSalary || 7180,
      workingDaysInMonth: standardWorkingDays,
      normalHours: recordedStats.normalHours > 0 ? recordedStats.normalHours : (standardWorkingDays * 8),
      nightHours: recordedStats.nightHours,
      overtimeHours: recordedStats.overtimeHours,
      mealTicketsCount: recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : standardWorkingDays,
      mealTicketValue: settings.mealTicketValue || 22,
      advancePayment: settings.standardAdvance || 1500,
    }));
  }, [recordedStats, standardWorkingDays, settings.grossSalary, settings.mealTicketValue, settings.standardAdvance]);

  // Calcul rezultat Simulator
  const simResult: PayrollBreakdown = useMemo(() => {
    return calculatePayroll(simInputs);
  }, [simInputs]);

  // STARE PENTRU MODUL AUDIT FLUTURAȘ
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [fluturasInputs, setFluturasInputs] = useState({
    normalHours: 152,
    nightHours: 42.9,
    overtimeHours: 28,
    mealTicketsCount: 19,
    grossTotal: 10777,
    netSalary: 5980,
    restDePlata: 4480,
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
    const appNormal = recordedStats.normalHours > 0 ? recordedStats.normalHours : (standardWorkingDays * 8);
    const appOvertime = recordedStats.overtimeHours;
    const appNight = recordedStats.nightHours;
    const appTickets = recordedStats.ticketDaysCount > 0 ? recordedStats.ticketDaysCount : standardWorkingDays;

    const diffNormal = Number((fluturasInputs.normalHours - appNormal).toFixed(1));
    const diffOvertime = Number((fluturasInputs.overtimeHours - appOvertime).toFixed(1));
    const diffNight = Number((fluturasInputs.nightHours - appNight).toFixed(1));
    const diffTickets = fluturasInputs.mealTicketsCount - appTickets;

    // Calcul valoare financiară a diferenței de ore suplimentare (plătite 200%)
    // Baza orară ~ 42.74 -> 200% = 85.48 brut -> Net ~ 55% din brut = ~47 RON net/oră
    const netHourlyOvertime = simResult.hourlyRate * 2 * 0.58;
    const lostOvertimeMoney = diffOvertime < 0 ? Math.round(Math.abs(diffOvertime) * netHourlyOvertime) : 0;
    const gainedOvertimeMoney = diffOvertime > 0 ? Math.round(diffOvertime * netHourlyOvertime) : 0;

    // Diferență rest de plată față de cel calculat de simulator
    const diffRestPlata = fluturasInputs.restDePlata - simResult.restDePlata;

    const isAllMatched =
      Math.abs(diffOvertime) < 0.5 &&
      Math.abs(diffNight) < 0.5 &&
      Math.abs(diffTickets) === 0;

    return {
      appNormal,
      appOvertime,
      appNight,
      appTickets,
      diffNormal,
      diffOvertime,
      diffNight,
      diffTickets,
      lostOvertimeMoney,
      gainedOvertimeMoney,
      diffRestPlata,
      isAllMatched,
    };
  }, [recordedStats, standardWorkingDays, fluturasInputs, simResult]);

  return (
    <div className="space-y-6 animate-fade-in pb-36">
      {/* HEADER CU GLASSMORPHISM */}
      <header className="px-6 pt-12 pb-7 header-gradient-bg rounded-b-[32px] shadow-lg text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm flex items-center gap-2">
              Calculator & Fluturaș ⚖️
            </h1>
            <p className="text-white/90 text-xs sm:text-sm font-medium mt-1">
              Simulator Salariu & Audit Cap-la-Cap • Avicarvil
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="bg-black/25 p-1.5 rounded-2xl flex relative backdrop-blur-md border border-white/20 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-white text-blue-600 dark:bg-blue-600 dark:text-white shadow-md scale-100'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <DollarSign size={16} />
              <span>Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-emerald-500 text-white shadow-md scale-100'
                  : 'text-white/80 hover:bg-white/10'
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
        <div className="flex items-center justify-between bg-white dark:bg-[#132337] p-3 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
          <button
            onClick={() => setSelectedMonthOffset(prev => prev - 1)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold"
            title="Luna precedentă"
          >
            ←
          </button>
          <div className="text-center">
            <span className="text-xs text-gray-400 dark:text-gray-400 block uppercase font-bold tracking-wider">
              Luna de referință
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white capitalize">
              {targetDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => setSelectedMonthOffset(prev => (prev < 0 ? prev + 1 : 0))}
            disabled={selectedMonthOffset >= 0}
            className={`p-2 rounded-xl text-gray-700 dark:text-gray-300 font-bold ${
              selectedMonthOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-white/10'
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
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[28px] p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-100">
                Rest de Plată (Lichidare pe Card)
              </span>
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-[11px] font-bold backdrop-blur-md">
                După Avans
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-sm mb-4">
              {simResult.restDePlata.toLocaleString('ro-RO')} <span className="text-2xl font-bold">RON</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-xs">
              <div>
                <span className="text-emerald-100 block font-medium">Salariu Net Total:</span>
                <span className="text-base font-bold">{simResult.netSalary.toLocaleString('ro-RO')} RON</span>
              </div>
              <div>
                <span className="text-emerald-100 block font-medium">Venit Brut Total:</span>
                <span className="text-base font-bold">{simResult.grossTotal.toLocaleString('ro-RO')} RON</span>
              </div>
            </div>
          </div>

          {/* CONTROALE ORE ȘI SLIDERE */}
          <div className="bg-white dark:bg-[#132337] rounded-[24px] p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
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
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Zile Concediu (CO)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={simInputs.vacationDays}
                  onChange={e => setSimInputs({ ...simInputs, vacationDays: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-mono text-sm font-bold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1">
                  <Ticket size={14} className="text-teal-500" />
                  Tichete Masă ({simInputs.mealTicketValue} lei)
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={simInputs.mealTicketsCount}
                  onChange={e => setSimInputs({ ...simInputs, mealTicketsCount: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-mono text-sm font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* 5. Avans Salariu Reținut */}
            <div className="pt-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Avans Reținut (RON)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={simInputs.advancePayment}
                onChange={e => setSimInputs({ ...simInputs, advancePayment: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-mono text-sm font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* ACORDEON DETALIERE FLUTURAȘ */}
          <div className="bg-white dark:bg-[#132337] rounded-[24px] p-5 border border-gray-100 dark:border-white/10 shadow-sm">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full flex justify-between items-center text-left"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  Desfășurător Fluturaș (Drepturi, Taxe & Rețineri)
                </span>
              </div>
              {showAdvancedSettings ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showAdvancedSettings && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 space-y-3 text-xs">
                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Tarif orar de bază ({simInputs.grossBaseSalary} lei / {simInputs.workingDaysInMonth * 8}h):</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{simResult.hourlyRate} RON/h</span>
                </div>

                {/* Drepturi */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">1. Drepturi Salariale (Brut)</span>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Ore normale ({simInputs.normalHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.normalIncome.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Ore suplimentare 200% ({simInputs.overtimeHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.overtimeIncome.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Spor noapte 25% ({simInputs.nightHours}h):</span>
                    <span className="font-mono font-semibold">{simResult.nightBonus.toLocaleString('ro-RO')} RON</span>
                  </div>
                  {simResult.vacationIncome > 0 && (
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Concediu odihnă ({simInputs.vacationDays} zile):</span>
                      <span className="font-mono font-semibold">{simResult.vacationIncome.toLocaleString('ro-RO')} RON</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Spor ore weekend (1%):</span>
                    <span className="font-mono font-semibold">{simResult.weekendBonus} RON</span>
                  </div>
                  <div className="flex justify-between text-teal-600 dark:text-teal-400 font-medium">
                    <span>Tichete de masă ({simInputs.mealTicketsCount} buc):</span>
                    <span className="font-mono font-bold">{simResult.mealTicketsTotal} RON</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-dashed border-gray-200 dark:border-white/10">
                    <span>TOTAL VENIT BRUT:</span>
                    <span className="font-mono">{simResult.grossTotal.toLocaleString('ro-RO')} RON</span>
                  </div>
                </div>

                {/* Taxe */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">2. Taxe & Impozite</span>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>CASS Sănătate (10%):</span>
                    <span className="font-mono text-red-500 font-semibold">- {simResult.cass.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>CAS Pensii (25% fără tichete):</span>
                    <span className="font-mono text-red-500 font-semibold">- {simResult.cas.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Impozit pe venit (10%):</span>
                    <span className="font-mono text-red-500 font-semibold">- {simResult.incomeTax.toLocaleString('ro-RO')} RON</span>
                  </div>
                </div>

                {/* Rețineri */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">3. Rețineri pe Card</span>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Contravaloare tichete (deja pe cardul de tichete):</span>
                    <span className="font-mono text-amber-500 font-semibold">- {simResult.mealTicketsTotal} RON</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Avans virat anterior:</span>
                    <span className="font-mono text-amber-500 font-semibold">- {simResult.advancePayment.toLocaleString('ro-RO')} RON</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-gray-200 dark:border-white/10 text-sm">
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
          <div className="bg-white dark:bg-[#132337] rounded-[28px] p-5 border border-gray-100 dark:border-white/10 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Camera size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Încarcă sau Fotografiază Fluturașul
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Facem automat citirea cifrelor prin OCR și le comparăm cu pontajul tău real.
            </p>

            <label className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm shadow-md cursor-pointer transition-all">
              <Upload size={16} />
              <span>{uploadedImage ? 'Schimbă Poza Fluturaș' : 'Selectează Poza Fluturaș'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {isOcrProcessing && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs font-bold text-blue-600 dark:text-blue-400">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Se analizează fluturașul... ({ocrProgress}%)</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* VERDICTUL DE AUDIT */}
          <div
            className={`p-4 rounded-[24px] border backdrop-blur-md transition-all ${
              auditDiffs.isAllMatched
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                : 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {auditDiffs.isAllMatched ? (
                <CheckCircle2 size={24} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={24} className="text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-black tracking-tight">
                  {auditDiffs.isAllMatched
                    ? '🟢 Fluturașul este 100% Corect!'
                    : '🔴 Discrepanțe Identificate în Fluturaș!'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {auditDiffs.isAllMatched
                    ? 'Orele de regie, suplimentare și de noapte trecute pe fluturaș corespund cu înregistrările tale din aplicație.'
                    : auditDiffs.diffOvertime < 0
                    ? `Fabrica ți-a trecut cu ${Math.abs(auditDiffs.diffOvertime)} ore suplimentare mai puțin! Pierdere estimată: ~${auditDiffs.lostOvertimeMoney} RON net.`
                    : `Există diferențe între pontajul tău și cifrele de pe fluturaș. Verifică tabelul comparativ de mai jos.`}
                </p>
              </div>
            </div>
          </div>

          {/* TABEL COMPARATIV CAP-LA-CAP */}
          <div className="bg-white dark:bg-[#132337] rounded-[24px] p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-white/5">
              Reconciliere Cap-la-Cap (Pontaj vs Fluturaș)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 font-bold border-b border-gray-100 dark:border-white/5">
                    <th className="pb-2">Rubrică</th>
                    <th className="pb-2 text-center">În Aplicație</th>
                    <th className="pb-2 text-center">Pe Fluturaș</th>
                    <th className="pb-2 text-right">Diferență</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-mono">
                  {/* 1. Ore Regie */}
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-gray-900 dark:text-white">Ore Normale</td>
                    <td className="text-center font-bold text-blue-600 dark:text-blue-400">{auditDiffs.appNormal}h</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.normalHours}
                        onChange={e => setFluturasInputs({ ...fluturasInputs, normalHours: parseFloat(e.target.value) || 0 })}
                        className="w-16 p-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-center text-xs font-bold"
                      />
                    </td>
                    <td className={`text-right font-bold ${auditDiffs.diffNormal === 0 ? 'text-gray-400' : auditDiffs.diffNormal < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffNormal > 0 ? `+${auditDiffs.diffNormal}h` : `${auditDiffs.diffNormal}h`}
                    </td>
                  </tr>

                  {/* 2. Ore Suplimentare */}
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-gray-900 dark:text-white">Ore Suplimentare</td>
                    <td className="text-center font-bold text-purple-600 dark:text-purple-400">{auditDiffs.appOvertime}h</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.overtimeHours}
                        onChange={e => setFluturasInputs({ ...fluturasInputs, overtimeHours: parseFloat(e.target.value) || 0 })}
                        className="w-16 p-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-center text-xs font-bold"
                      />
                    </td>
                    <td className={`text-right font-bold ${auditDiffs.diffOvertime === 0 ? 'text-gray-400' : auditDiffs.diffOvertime < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffOvertime > 0 ? `+${auditDiffs.diffOvertime}h` : `${auditDiffs.diffOvertime}h`}
                    </td>
                  </tr>

                  {/* 3. Ore de Noapte */}
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-gray-900 dark:text-white">Ore Noapte</td>
                    <td className="text-center font-bold text-indigo-600 dark:text-indigo-400">{auditDiffs.appNight}h</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.nightHours}
                        onChange={e => setFluturasInputs({ ...fluturasInputs, nightHours: parseFloat(e.target.value) || 0 })}
                        className="w-16 p-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-center text-xs font-bold"
                      />
                    </td>
                    <td className={`text-right font-bold ${auditDiffs.diffNight === 0 ? 'text-gray-400' : auditDiffs.diffNight < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffNight > 0 ? `+${auditDiffs.diffNight}h` : `${auditDiffs.diffNight}h`}
                    </td>
                  </tr>

                  {/* 4. Tichete Masă */}
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-gray-900 dark:text-white">Tichete Masă</td>
                    <td className="text-center font-bold text-teal-600 dark:text-teal-400">{auditDiffs.appTickets}</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.mealTicketsCount}
                        onChange={e => setFluturasInputs({ ...fluturasInputs, mealTicketsCount: parseInt(e.target.value) || 0 })}
                        className="w-16 p-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-center text-xs font-bold"
                      />
                    </td>
                    <td className={`text-right font-bold ${auditDiffs.diffTickets === 0 ? 'text-gray-400' : auditDiffs.diffTickets < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffTickets > 0 ? `+${auditDiffs.diffTickets}` : `${auditDiffs.diffTickets}`}
                    </td>
                  </tr>

                  {/* 5. Rest de Plată */}
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-gray-900 dark:text-white">Rest Plată</td>
                    <td className="text-center font-bold text-emerald-600 dark:text-emerald-400">{simResult.restDePlata} lei</td>
                    <td className="text-center">
                      <input
                        type="number"
                        value={fluturasInputs.restDePlata}
                        onChange={e => setFluturasInputs({ ...fluturasInputs, restDePlata: parseFloat(e.target.value) || 0 })}
                        className="w-20 p-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-center text-xs font-bold"
                      />
                    </td>
                    <td className={`text-right font-bold ${auditDiffs.diffRestPlata === 0 ? 'text-gray-400' : auditDiffs.diffRestPlata < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {auditDiffs.diffRestPlata > 0 ? `+${auditDiffs.diffRestPlata} lei` : `${auditDiffs.diffRestPlata} lei`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-400 pt-2 italic">
              * Poți ajusta direct cifrele din coloana „Pe Fluturaș” dacă poza a fost parțial neclară.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};