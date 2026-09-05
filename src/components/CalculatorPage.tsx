import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Moon,
  Zap,
  Ticket,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';
import type { AppSettings, WorkSession } from '../types';
import { getLocalISODate } from '../utils/dateUtils';
import { calculateDurationWithBreak, calculateNightHours } from '../utils/timeRounding';

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

// Zile lucrătoare Luni-Vineri excluzând sărbătorile legale
const getWorkingDaysInMonth = (year: number, month: number, holidays: string[] = []): number => {
  if (year < 2000 || year > 2100 || month < 0 || month > 11) return 20;

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
  const [activeTab, setActiveTab] = useState<'calculator' | 'audit'>('calculator');

  const refDate = useMemo(() => {
    return (referenceDate instanceof Date && !isNaN(referenceDate.getTime())) ? referenceDate : new Date();
  }, [referenceDate]);

  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();

  // Zile lucrătoare standard (L-V fără sărbători legale)
  const standardWorkingDays = useMemo(() => {
    return getWorkingDaysInMonth(currentYear, currentMonth, settings.legalHolidays);
  }, [currentYear, currentMonth, settings.legalHolidays]);

  // Salariu net de bază (4200 RON conform discutie.md)
  const salaryNet = settings.monthlySalary || 4200;
  // Salariu brut de încadrare (7180 RON conform discutie.md)
  const grossSalary = settings.grossSalary || 7180;
  // Spor fix regie / weekend 1% din 7180 = 71.80 RON
  const sporRegie = settings.sporRegieFixed || 71.80;
  // Valoare tichet masă (22 RON conform discutie.md)
  const mealTicketVal = settings.mealTicketValue || 22;

  // Calcul exact din sesiunile lunii curente
  const computedMonthStats = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    let normalH = 0;
    let overtimeH = 0;
    let nightH = 0;
    const ticketDays = new Set<string>();

    workSessions.forEach(session => {
      const sDate = new Date(session.startTime);
      if (sDate >= startOfMonth && sDate <= endOfMonth) {
        const dStr = getLocalISODate(sDate);
        const dayOfWeek = sDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = (settings.legalHolidays || []).includes(dStr);

        // Durată efectivă cu scăderea automată a pauzei de 30 min
        const duration = calculateDurationWithBreak(new Date(session.startTime), new Date(session.endTime));

        // Ore de noapte (22:00 - 06:00)
        nightH += calculateNightHours(new Date(session.startTime), new Date(session.endTime));

        if (isWeekend || isHoliday) {
          overtimeH += duration;
        } else {
          // Luni-Vineri fără sărbătoare: eligibil pentru tichet de masă (22 RON)
          if (duration > 0) {
            ticketDays.add(dStr);
          }
          if (duration <= (settings.normalHoursLimit || 8)) {
            normalH += duration;
          } else {
            normalH += settings.normalHoursLimit || 8;
            overtimeH += (duration - (settings.normalHoursLimit || 8));
          }
        }
      }
    });

    return {
      normalHours: normalH,
      overtimeHours: overtimeH,
      nightHours: nightH,
      ticketDaysCount: ticketDays.size,
    };
  }, [workSessions, currentYear, currentMonth, settings.legalHolidays, settings.normalHoursLimit]);

  // Ore editabile în tabul de calcul
  const [hours, setHours] = useState({
    normal: computedMonthStats.normalHours || totalNormalHours || (standardWorkingDays * 8),
    night: computedMonthStats.nightHours || totalNightHours || 0,
    overtime: computedMonthStats.overtimeHours || totalOvertimeHours || 0
  });

  useEffect(() => {
    setHours({
      normal: computedMonthStats.normalHours || (standardWorkingDays * 8),
      night: computedMonthStats.nightHours || 0,
      overtime: computedMonthStats.overtimeHours || 0
    });
  }, [computedMonthStats, standardWorkingDays]);

  const [extras, setExtras] = useState({
    mealTicketsCount: computedMonthStats.ticketDaysCount,
    mealTicketValue: mealTicketVal,
    advance: settings.standardAdvance || 1500
  });

  useEffect(() => {
    setExtras(prev => ({
      ...prev,
      mealTicketsCount: computedMonthStats.ticketDaysCount,
      mealTicketValue: mealTicketVal,
      advance: settings.standardAdvance || 1500
    }));
  }, [computedMonthStats.ticketDaysCount, mealTicketVal, settings.standardAdvance]);

  // Tarif orar de bază = Salariu net / (Zile lucrătoare * 8)
  const hourlyRate = useMemo(() => {
    return standardWorkingDays > 0 ? (salaryNet / (standardWorkingDays * 8)) : 26.25;
  }, [salaryNet, standardWorkingDays]);

  // Calcule Financiare (Conform discutie.md)
  // 1. Venit ore normale
  const incomeNormal = hours.normal * hourlyRate;
  // 2. Venit ore suplimentare (regula 1:1 agreată)
  const incomeOvertime = hours.overtime * hourlyRate;
  // 3. Spor ore de noapte: 25% * hourlyRate * ore_noapte
  const incomeNightBonus = hours.night * hourlyRate * 0.25;
  // 4. Spor fix regie/weekend 1% din salariu brut (7180 * 1% = 71.80 RON)
  const incomeSporRegie = sporRegie;
  // 5. Total venit net
  const totalVenitNet = incomeNormal + incomeOvertime + incomeNightBonus + incomeSporRegie;
  // 6. Contravaloare tichete de masă (22 RON/zi)
  const incomeTicketsTotal = extras.mealTicketsCount * extras.mealTicketValue;
  // 7. Rest de plată lichidare = Venit net total - Avans - Tichete
  const restDePlataCalculat = totalVenitNet - extras.advance - incomeTicketsTotal;

  // --- STARE MODUL AUDIT FLUTURAȘ FABRICĂ ---
  const [fluturasData, setFluturasData] = useState({
    venitBrut: grossSalary,
    oreSuplimentare200: (hours.overtime / 2).toFixed(1), // Artificiul fabricii: ore_reale / 2 la 200%
    oreNoapte: hours.night.toFixed(1),
    avansRetinut: 1500,
    ticheteRetinute: computedMonthStats.ticketDaysCount * 22,
    restDePlataFluturas: Math.round(restDePlataCalculat)
  });

  // Re-sincronizează fluturașul când se schimbă orele
  useEffect(() => {
    setFluturasData(prev => ({
      ...prev,
      oreSuplimentare200: (hours.overtime / 2).toFixed(1),
      oreNoapte: hours.night.toFixed(1),
      ticheteRetinute: extras.mealTicketsCount * 22,
      restDePlataFluturas: Math.round(restDePlataCalculat)
    }));
  }, [hours.overtime, hours.night, extras.mealTicketsCount, restDePlataCalculat]);

  // AUDIT LOGIC
  const fluturasOre200 = parseFloat(fluturasData.oreSuplimentare200 as string) || 0;
  // Ore reale plătite de fabrică = oreFluturas * 2
  const oreEchivalenteFabrica = fluturasOre200 * 2;
  const oreSuplimentareReale = hours.overtime;
  const diferentaOreSuplimentare = oreSuplimentareReale - oreEchivalenteFabrica;
  const baniPierdutiOvertime = diferentaOreSuplimentare > 0 ? (diferentaOreSuplimentare * hourlyRate) : 0;

  const fluturasRestPlata = parseFloat(fluturasData.restDePlataFluturas as any) || 0;
  const diferentaRestPlata = restDePlataCalculat - fluturasRestPlata;
  const hasDiscrepantaRest = Math.abs(diferentaRestPlata) >= 1;
  const hasDiscrepantaOvertime = diferentaOreSuplimentare > 0.05;
  const isAuditTriggered = hasDiscrepantaOvertime || hasDiscrepantaRest;

  return (
    <div className="space-y-6 animate-fade-in pb-36">
      {/* HEADER CU GLASSMORPHISM */}
      <header className="px-6 pt-12 pb-7 header-gradient-bg rounded-b-[32px] shadow-lg text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm flex items-center gap-2">
              Calculator & Audit ⚖️
            </h1>
            <p className="text-white/90 text-xs sm:text-sm font-medium mt-1">
              TikTok Work v6.2.0 • Mecanismul Fabricii & Reconciliere Fluturaș
            </p>
          </div>

          {/* TAB SWITCHER */}
          <div className="bg-black/20 p-1.5 rounded-full flex relative backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'calculator'
                  ? 'bg-white text-blue-600 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Simulator Salariu
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-amber-400 text-gray-900 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Audit Fluturaș
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'calculator' ? (
        /* ================= TAB 1: SIMULATOR SALARIU ================= */
        <div className="px-4 space-y-5">
          {/* CARD REZULTAT: TOTAL REST DE PLATĂ */}
          <div className="relative overflow-hidden rounded-[28px] p-6 text-white shadow-xl bg-gradient-to-br from-[#0072FF] to-[#00C6FF] border border-white/20">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                  ESTIMARE REST DE PLATĂ (LICHIDARE)
                </span>
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold">
                  {standardWorkingDays} zile lucrătoare
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight my-2 drop-shadow-sm">
                {restDePlataCalculat.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-2xl font-normal ml-2 opacity-90">{settings.currency}</span>
              </h2>
              <p className="text-xs text-white/80 font-medium">
                Calculat din: Venit net ({totalVenitNet.toFixed(2)} RON) - Avans ({extras.advance} RON) - Tichete ({incomeTicketsTotal} RON).
              </p>
            </div>
          </div>

          {/* PARAMETRI FINANCIARI DE BAZĂ */}
          <div className="bg-white dark:bg-[#132337] rounded-[26px] p-5 shadow-md border border-gray-100 dark:border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Parametri Contract & Bază de Calcul
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Salariu Net de Bază
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={salaryNet}
                    onChange={(e) => onSettingsChange({ ...settings, monthlySalary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xl font-bold bg-transparent outline-none text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-400">RON</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                  Salariu Brut Încadrare
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={grossSalary}
                    onChange={(e) => onSettingsChange({ ...settings, grossSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xl font-bold bg-transparent outline-none text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-400">RON</span>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs flex justify-between items-center font-medium">
              <span>Tarif orar de bază ({salaryNet} ÷ ({standardWorkingDays}z × 8h)):</span>
              <strong className="text-sm font-bold font-mono">{hourlyRate.toFixed(2)} RON/h</strong>
            </div>
          </div>

          {/* PONTAJ ORE & SPORURI */}
          <div className="bg-white dark:bg-[#132337] rounded-[26px] p-5 shadow-md border border-gray-100 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Pontaj Ore & Valoare Bani
            </h3>

            {/* Ore Normale */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Ore Normale (8h/zi)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tarif 100% ({hourlyRate.toFixed(2)} RON/h)</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-gray-900 dark:text-white mr-2">{hours.normal.toFixed(1)}h</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block font-mono">
                  {incomeNormal.toFixed(2)} RON
                </span>
              </div>
            </div>

            {/* Ore Suplimentare */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
              <div>
                <p className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600" />
                  Ore Suplimentare Reale
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Regula 1:1 (sau fluturaș: {(hours.overtime / 2).toFixed(1)}h la 200%)
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-purple-900 dark:text-purple-200 mr-2">{hours.overtime.toFixed(1)}h</span>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block font-mono">
                  {incomeOvertime.toFixed(2)} RON
                </span>
              </div>
            </div>

            {/* Ore de Noapte */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
              <div>
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  Ore de Noapte (22:00 - 06:00)
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Spor 25% (+{(hourlyRate * 0.25).toFixed(2)} RON/h)
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-indigo-900 dark:text-indigo-200 mr-2">{hours.night.toFixed(1)}h</span>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block font-mono">
                  +{incomeNightBonus.toFixed(2)} RON
                </span>
              </div>
            </div>

            {/* Spor Regie / Weekend (1%) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30">
              <div>
                <p className="text-sm font-bold text-teal-900 dark:text-teal-200">
                  Spor Regie / Weekend (1%)
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400">
                  Fix lunar (1% din salariu brut {grossSalary} RON)
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-teal-900 dark:text-teal-200 font-mono">
                  +{incomeSporRegie.toFixed(2)} RON
                </span>
              </div>
            </div>
          </div>

          {/* BENEFICII & DEDUCERI (TICHETE & AVANS) */}
          <div className="bg-white dark:bg-[#132337] rounded-[26px] p-5 shadow-md border border-gray-100 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-500" />
              Tichete de Masă & Rețineri
            </h3>

            {/* Tichete de masă */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Tichete de Masă ({extras.mealTicketsCount} zile L-V)
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {extras.mealTicketValue} RON / zi (fără weekend/sărbători)
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-900 dark:text-emerald-200 block font-mono">
                  {incomeTicketsTotal} RON
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">pe card dedicat</span>
              </div>
            </div>

            {/* Avans Reținut */}
            <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Avans Încasat la Cincisprezece
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Se deduce din restul de plată lichidare
                </p>
              </div>
              <div className="text-right flex items-center gap-1">
                <input
                  type="number"
                  value={extras.advance}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setExtras(prev => ({ ...prev, advance: val }));
                    onSettingsChange({ ...settings, standardAdvance: val });
                  }}
                  className="w-24 text-right text-base font-bold bg-transparent outline-none text-rose-900 dark:text-rose-200 font-mono"
                />
                <span className="text-xs font-bold text-rose-600">RON</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: MODULUL DE AUDIT FINANCIAR („MECANISMUL FABRICII”) ================= */
        <div className="px-4 space-y-5">
          {/* INTRODUCTORY CARD */}
          <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-[28px] p-6 text-white shadow-xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Audit Financiar & Fluturaș Fabrică
                </h2>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Fabrica folosește artificiul contabil de a declara jumătate din orele suplimentare la <strong>200%</strong> (pentru a se încadra în plafonul legal). Introdu datele de pe fluturaș pentru reconciliere automată.
                </p>
              </div>
            </div>
          </div>

          {/* ALERTA AMBER (CHIHLIMBAR) - DACĂ EXISTĂ DISCREPANȚE */}
          {isAuditTriggered ? (
            <div className="rounded-[26px] p-5 shadow-lg border-2 border-amber-500 bg-amber-500/15 backdrop-blur-xl animate-pulse">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="text-base font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    ⚠️ ALERTĂ AUDIT: Discrepanțe Identificate pe Fluturaș!
                  </h3>

                  {hasDiscrepantaOvertime && (
                    <div className="text-xs text-amber-950 dark:text-amber-100 space-y-1">
                      <p>
                        • <strong>Ore Suplimentare Neplătite:</strong> Ai lucrat în realitate <strong>{oreSuplimentareReale.toFixed(1)} ore suplimentare</strong>. Pe fluturaș apar doar <strong>{fluturasOre200} ore la 200%</strong> (echivalentul a <strong>{oreEchivalenteFabrica.toFixed(1)} ore reale</strong>).
                      </p>
                      <p className="font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 p-2 rounded-lg">
                        Pierdere estimată la ore: {diferentaOreSuplimentare.toFixed(1)}h × {hourlyRate.toFixed(2)} RON = {baniPierdutiOvertime.toFixed(2)} RON neplătiți!
                      </p>
                    </div>
                  )}

                  {hasDiscrepantaRest && (
                    <div className="text-xs text-amber-950 dark:text-amber-100">
                      • <strong>Diferență Rest de Plată:</strong> Conform pontajului trebuia să primești <strong>{restDePlataCalculat.toFixed(2)} RON</strong>, dar pe fluturaș ai înscris <strong>{fluturasRestPlata.toFixed(2)} RON</strong> (diferență: {Math.abs(diferentaRestPlata).toFixed(2)} RON).
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[26px] p-5 shadow-md border border-emerald-500/50 bg-emerald-500/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                    Audit Confirmat: Totul corespunde 100%!
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Orele suplimentare declarate la 200% acoperă exact orele reale lucrate, iar restul de plată este reconciliat.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FORMULAR FLUTURAȘ */}
          <div className="bg-white dark:bg-[#132337] rounded-[26px] p-5 shadow-md border border-gray-100 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Date Înscrise pe Fluturașul Primit
            </h3>

            <div className="space-y-3">
              {/* Ore Suplimentare 200% */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                <div>
                  <label className="text-sm font-bold text-gray-900 dark:text-white block">
                    Ore Suplimentare pe Fluturaș (cota 200%)
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Echivalent ore reale: {oreEchivalenteFabrica.toFixed(1)}h (din {oreSuplimentareReale.toFixed(1)}h lucrate)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={fluturasData.oreSuplimentare200}
                    onChange={(e) => setFluturasData({ ...fluturasData, oreSuplimentare200: e.target.value })}
                    className="w-20 text-right text-lg font-bold bg-white dark:bg-white/10 px-2 py-1 rounded-xl outline-none border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-500">h</span>
                </div>
              </div>

              {/* Ore de Noapte Fluturaș */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                <div>
                  <label className="text-sm font-bold text-gray-900 dark:text-white block">
                    Ore de Noapte pe Fluturaș
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Înregistrate în aplicație: {hours.night.toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={fluturasData.oreNoapte}
                    onChange={(e) => setFluturasData({ ...fluturasData, oreNoapte: e.target.value })}
                    className="w-20 text-right text-lg font-bold bg-white dark:bg-white/10 px-2 py-1 rounded-xl outline-none border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-500">h</span>
                </div>
              </div>

              {/* Avans Reținut Fluturaș */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                <div>
                  <label className="text-sm font-bold text-gray-900 dark:text-white block">
                    Avans Reținut pe Fluturaș
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Implicit: 1500 RON
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={fluturasData.avansRetinut}
                    onChange={(e) => setFluturasData({ ...fluturasData, avansRetinut: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right text-lg font-bold bg-white dark:bg-white/10 px-2 py-1 rounded-xl outline-none border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-500">RON</span>
                </div>
              </div>

              {/* Tichete Reținute Fluturaș */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                <div>
                  <label className="text-sm font-bold text-gray-900 dark:text-white block">
                    Tichete Reținute pe Fluturaș
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Contravaloare card tichete ({extras.mealTicketsCount} zile × 22 RON)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={fluturasData.ticheteRetinute}
                    onChange={(e) => setFluturasData({ ...fluturasData, ticheteRetinute: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right text-lg font-bold bg-white dark:bg-white/10 px-2 py-1 rounded-xl outline-none border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-gray-500">RON</span>
                </div>
              </div>

              {/* Rest de Plată Înscris pe Fluturaș */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
                <div>
                  <label className="text-sm font-black text-blue-950 dark:text-blue-100 block">
                    Rest de Plată Înscris pe Fluturaș
                  </label>
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    Suma netă finală virată pe card de fabrică
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={fluturasData.restDePlataFluturas}
                    onChange={(e) => setFluturasData({ ...fluturasData, restDePlataFluturas: parseFloat(e.target.value) || 0 })}
                    className="w-28 text-right text-xl font-black bg-white dark:bg-white/20 px-3 py-1.5 rounded-xl outline-none border border-blue-300 dark:border-blue-500 text-blue-900 dark:text-white font-mono"
                  />
                  <span className="text-xs font-bold text-blue-700">RON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};