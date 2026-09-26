import React, { useMemo, useState, useEffect } from "react";
import type { WorkSession, AppSettings, SpecialDay, SpecialDayType } from "../types";
import {
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Zap,
  Check,
} from "lucide-react";
import {
  calculateEffectiveHourlyRate,
  calculateSalary,
  calculateDurationWithBreak,
} from "../utils/timeRounding";
import { getLocalISODate } from '../utils/dateUtils';
import { MonthlyReportModal } from "./MonthlyReportModal";
import { Shift2Modal } from "./Shift2Modal";
import { SHIFT_PRESETS, createSessionFromPreset, ShiftPreset } from "../utils/shiftPresets";

interface HistoryPageProps {
  workSessions: WorkSession[];
  settings: AppSettings;
  todaySessions: WorkSession[];
  formatHoursMinutes: (hours: number) => string;
  onDeleteSession: (identifier: string | number) => void;
  onAddSession: (session: WorkSession) => void;
  onUpdateSession?: (identifier: string | number, start: Date, end: Date) => void;
  onSettingsChange: (settings: AppSettings) => void;
  addNotification?: (message: string) => void;
}
interface DaySummary {
  date: string;
  sessions: (WorkSession & { originalIndex: number })[];
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  dailyPay: number;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMonthName = (date: Date) => {
  return date.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
};

const areDatesEqual = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const HistoryPage: React.FC<HistoryPageProps> = ({
  workSessions,
  settings,
  formatHoursMinutes,
  onDeleteSession,
  onAddSession,
  onUpdateSession,
  onSettingsChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter States
  const [filterStartDate] = useState("");
  const [filterEndDate] = useState("");
  const [filterType] = useState<"all" | "normal" | "overtime">(
    "all"
  );

  // Manual Entry / Edit Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShift2Modal, setShowShift2Modal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | number | null>(null);
  const [startHour, setStartHour] = useState("06");
  const [startMinute, setStartMinute] = useState("30");
  const [endHour, setEndHour] = useState("15");
  const [endMinute, setEndMinute] = useState("00");
  const [errorMessage, setErrorMessage] = useState("");

  // Special Days Map
  const specialDaysMap = useMemo(() => {
    const map = new Map<string, SpecialDay>();
    (settings.specialDays || []).forEach(sd => {
      map.set(sd.date, sd);
    });
    return map;
  }, [settings.specialDays]);

  const selectedDateKey = selectedDate ? getLocalISODate(selectedDate) : null;
  const selectedSpecialDay = selectedDateKey ? specialDaysMap.get(selectedDateKey) : null;

  const handleToggleSpecialDay = (type: SpecialDayType) => {
    if (!selectedDateKey) return;
    const currentList = settings.specialDays || [];
    const exists = currentList.find(sd => sd.date === selectedDateKey);

    let updatedList: SpecialDay[];
    if (exists && exists.type === type) {
      updatedList = currentList.filter(sd => sd.date !== selectedDateKey);
    } else {
      updatedList = currentList.filter(sd => sd.date !== selectedDateKey).concat({
        date: selectedDateKey,
        type,
      });
    }

    onSettingsChange({
      ...settings,
      specialDays: updatedList,
    });
  };

  const handleApplyPreset = (preset: ShiftPreset) => {
    if (!selectedDate) return;
    const session = createSessionFromPreset(preset, selectedDate);
    onAddSession(session);
  };

  // Reset selected date if it falls out of filter (optional, but good UX)
  useEffect(() => {
    setSelectedDate(null);
  }, [filterStartDate, filterEndDate, filterType]);

  // 1. Process all data into a Map with Filtering applied
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, DaySummary>();

    // Helper to get consistent date key (YYYY-MM-DD)
    const getDateKey = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // Pre-calculate date objects for range filtering to avoid doing it inside the loop
    const startFilter = filterStartDate ? new Date(filterStartDate) : null;
    if (startFilter) startFilter.setHours(0, 0, 0, 0);

    const endFilter = filterEndDate ? new Date(filterEndDate) : null;
    if (endFilter) endFilter.setHours(23, 59, 59, 999);

    workSessions.forEach((session, index) => {
      const sStart = new Date(session.startTime);
      const sEnd = new Date(session.endTime);

      // --- DATE RANGE FILTER ---
      if (startFilter && sStart < startFilter) return;
      if (endFilter && sStart > endFilter) return;

      const key = getDateKey(sStart);

      if (!map.has(key)) {
        map.set(key, {
          // Use local ISO date string instead of UTC-shifted toISOString()
          date: getLocalISODate(sStart),
          sessions: [],
          totalHours: 0,
          normalHours: 0,
          overtimeHours: 0,
          dailyPay: 0,
        });
      }
      // Attach original index and session details
      map.get(key)!.sessions.push({
        ...session,
        startTime: sStart,
        endTime: sEnd,
        originalIndex: index,
      });
    });

    // Calculate totals and Apply Type Filter
    const filteredMap = new Map<string, DaySummary>();

    // Calculate effective hourly rate (supports gross/net via taxRatePercent)
    const effectiveRate = calculateEffectiveHourlyRate(
      settings.salaryMode,
      settings.monthlySalary,
      settings.workingDaysPerMonth,
      settings.hourlyRate,
      settings.salaryIsGross ?? true,
      settings.taxRatePercent ?? 0
    );

    map.forEach((summary, key) => {
      // Sum session durations with automatic 30-minute break deducted from each session
      const totalHours = summary.sessions.reduce(
        (acc, s) =>
          acc + calculateDurationWithBreak(new Date(s.startTime), new Date(s.endTime)),
        0
      );

      summary.totalHours = totalHours;

      const dayOfWeek = new Date(summary.date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Check for holiday
      const dateKey = summary.date.split('T')[0];
      const isHoliday = settings.legalHolidays?.includes(dateKey);

      if (isWeekend || isHoliday) {
        // Toate orele din zi de weekend sau sărbătoare legală sunt ore suplimentare (minus 0.5h pauză)
        summary.normalHours = 0;
        summary.overtimeHours = totalHours > 0.5 ? totalHours - 0.5 : totalHours;
        summary.totalHours = summary.overtimeHours;
        const salaryCalc = calculateSalary(0, summary.overtimeHours, effectiveRate, settings.overtimeMultiplier ?? 1);
        summary.dailyPay = salaryCalc.totalPay;
      } else if (settings.hasNoLimit) {
        summary.normalHours = totalHours;
        summary.overtimeHours = 0;
        summary.totalHours = totalHours;
        summary.dailyPay = totalHours * effectiveRate;
      } else {
        summary.normalHours = Math.min(totalHours, settings.normalHoursLimit);
        const rawOvertime = Math.max(0, totalHours - settings.normalHoursLimit);
        // Scădere jumătate de oră (30 min) exclusiv din orele suplimentare
        // Ex: 8h normale + 2h suplimentare => 8h normale și 1.5h suplimentare
        summary.overtimeHours = rawOvertime > 0 ? Math.max(0, rawOvertime - 0.5) : 0;
        summary.totalHours = summary.normalHours + summary.overtimeHours;

        // Calculate with overtime consideration
        const salaryCalc = calculateSalary(
          summary.normalHours,
          summary.overtimeHours,
          effectiveRate,
          settings.overtimeMultiplier ?? 1
        );
        summary.dailyPay = salaryCalc.totalPay;
      }

      summary.sessions.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // --- TYPE FILTER ---
      let includeDay = true;
      if (!settings.hasNoLimit) {
        // Only apply these filters if limits exist
        if (filterType === "overtime" && summary.overtimeHours <= 0)
          includeDay = false;
        if (filterType === "normal" && summary.normalHours <= 0)
          includeDay = false;
      }

      if (includeDay) {
        filteredMap.set(key, summary);
      }
    });

    return filteredMap;
  }, [workSessions, settings, filterStartDate, filterEndDate, filterType]);

  // Grand totals (Calculated from filtered sessions)
  const grandTotals = useMemo(() => {
    let t = 0,
      n = 0,
      o = 0,
      p = 0;
    sessionsByDate.forEach((day) => {
      t += day.totalHours;
      n += day.normalHours;
      o += day.overtimeHours;
      p += day.dailyPay;
    });
    return { total: t, normal: n, overtime: o, pay: p };
  }, [sessionsByDate]);

  // Calendar Logic
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDay = new Date(year, month, 1).getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const hasActiveFilters =
    filterStartDate || filterEndDate || filterType !== "all";

  const getDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const selectedDaySummary = selectedDate
    ? sessionsByDate.get(getDateKey(selectedDate))
    : null;
  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];





  const handleOpenEditModal = (session: WorkSession & { originalIndex: number }) => {
    const sStart = new Date(session.startTime);
    const sEnd = new Date(session.endTime);
    setSelectedDate(sStart);
    setEditingSessionId(session.id || session.originalIndex);
    setStartHour(String(sStart.getHours()).padStart(2, "0"));
    const roundedStartM = Math.round(sStart.getMinutes() / 5) * 5 % 60;
    setStartMinute(String(roundedStartM).padStart(2, "0"));
    setEndHour(String(sEnd.getHours()).padStart(2, "0"));
    const roundedEndM = Math.round(sEnd.getMinutes() / 5) * 5 % 60;
    setEndMinute(String(roundedEndM).padStart(2, "0"));
    setErrorMessage("");
    setShowAddModal(true);
  };

  const handleSaveManualSession = () => {
    setErrorMessage("");
    if (!selectedDate) return;

    const startH = parseInt(startHour);
    const startM = parseInt(startMinute);
    const endH = parseInt(endHour);
    const endM = parseInt(endMinute);

    // Create base dates using selectedDate
    const start = new Date(selectedDate);
    start.setHours(startH, startM, 0, 0);

    let end = new Date(selectedDate);
    end.setHours(endH, endM, 0, 0);

    // Handle overnight shifts (end time is next day)
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    const finalStart = start;
    const finalEnd = end;

    if (finalEnd <= finalStart) {
      setErrorMessage("Ora de sfârșit trebuie să fie după ora de început.");
      return;
    }

    // Validare anti-suprapunere (ignoring currently edited session)
    const hasOverlap = workSessions.some((existing, idx) => {
      const isCurrent = editingSessionId !== null && (
        (existing.id && existing.id === editingSessionId) ||
        idx === editingSessionId ||
        String(existing.id) === String(editingSessionId) ||
        String(idx) === String(editingSessionId)
      );
      if (isCurrent) {
        return false;
      }
      const exStart = new Date(existing.startTime).getTime();
      const exEnd = new Date(existing.endTime).getTime();
      const newStart = finalStart.getTime();
      const newEnd = finalEnd.getTime();
      return newStart < exEnd && newEnd > exStart;
    });

    if (hasOverlap) {
      setErrorMessage("Sesiunea se suprapune cu o altă sesiune de lucru deja înregistrată!");
      return;
    }

    if (editingSessionId !== null && onUpdateSession) {
      onUpdateSession(editingSessionId, finalStart, finalEnd);
    } else {
      onAddSession({
        startTime: finalStart,
        endTime: finalEnd,
      });
    }

    // Reset and close
    setShowAddModal(false);
    setEditingSessionId(null);
  };

  // Helper to preview duration
  const getPreviewDuration = () => {
    const startH = parseInt(startHour);
    const startM = parseInt(startMinute);
    const endH = parseInt(endHour);
    const endM = parseInt(endMinute);

    let minutes = (endH * 60 + endM) - (startH * 60 + startM);
    // If negative, it means overnight (add 24h)
    if (minutes < 0) minutes += 24 * 60;

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { h, m, isOvernight: (endH * 60 + endM) < (startH * 60 + startM) };
  };

  const preview = getPreviewDuration();

  return (
    <div className="space-y-4 animate-fade-in pb-24">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-7 mb-4 relative header-gradient-bg rounded-b-[32px] shadow-lg -mx-4">
        <h1 className="text-3xl font-black mb-1 tracking-tight text-white drop-shadow-sm">
          Istoric
        </h1>
        <p className="text-sm font-medium opacity-90 text-white">
          {settings.userName || 'Florin'}, O zi bună începe cu o cafea și un plan bun. 📝
        </p>
      </header>

      {/* 1. Grand Summary Card */}
      <div className="bg-gradient-to-r from-[#0284C7] to-[#0072FF] dark:from-[#0C3058] dark:to-[#123E6E] p-6 rounded-[28px] shadow-lg dark:shadow-black/40 border border-sky-400/30 dark:border-white/10 relative overflow-hidden mx-2 mb-4 text-white transition-all duration-300 z-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 dark:bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 dark:border-white/10 shadow-inner">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {hasActiveFilters ? "Total (Filtrat)" : "Total General"}
            </h2>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold border border-white/30 shadow-sm transition-all active:scale-95 text-white"
            title="Deschide Foaia Oficială de Pontaj (PDF / Excel)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Raport Pontaj</span>
          </button>
        </div>

        <div className="text-center p-2 relative z-10">
          <p className="text-4xl font-black text-white">
            {formatHoursMinutes(grandTotals.total)}
          </p>
          <p className="text-xs font-medium text-white/80 mt-1 uppercase tracking-wider">Total Ore</p>
        </div>
      </div>

      {/* 2. Calendar */}
      <div className="bg-white dark:bg-[#132337]/85 backdrop-blur-xl border border-gray-100 dark:border-white/10 p-6 rounded-[28px] shadow-md dark:shadow-black/40 mx-2 transition-all duration-300 relative overflow-hidden z-10">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <h3 className="font-bold text-xl text-gray-900 dark:text-white capitalize tracking-wide">
            {getMonthName(currentMonth)}
          </h3>

          <button
            onClick={handleNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Buton Raport Oficial Luna Curentă */}
        <div className="mb-5 relative z-10">
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-850/50 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-all shadow-xs active:scale-[0.99]"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Foaie Oficială Pontaj {getMonthName(currentMonth)} (PDF / Excel)</span>
          </button>
        </div>

        {/* Grid */}
        <div className="relative z-10">
          <div className="grid grid-cols-7 mb-3">
            {weekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="h-8 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              if (!date)
                return <div key={`empty-${index}`} className="h-10 sm:h-12" />;

              const isSelected = areDatesEqual(date, selectedDate);
              const isToday = areDatesEqual(date, new Date());
              const dateKey = getDateKey(date);
              const hasData = sessionsByDate.has(dateKey);
              const isHoliday = settings.legalHolidays?.includes(dateKey);
              const specialDay = specialDaysMap.get(dateKey);

              let dayClasses = "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"; // Default

              if (hasData) {
                dayClasses = "bg-[#FF3B30] text-white shadow-md shadow-red-500/20 border border-red-500/50 relative overflow-hidden";
              } else if (specialDay?.type === 'CO') {
                dayClasses = "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/80 font-black";
              } else if (specialDay?.type === 'CM') {
                dayClasses = "bg-amber-600 text-white shadow-md shadow-amber-600/30 border border-amber-400/80 font-black";
              } else if (specialDay?.type === 'RECUPERARE') {
                dayClasses = "bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-400/80 font-black";
              } else if (isSelected) {
                dayClasses = "bg-[#2ECC71] text-white shadow-md shadow-emerald-500/20 scale-105 rounded-xl ring-2 ring-emerald-400/40";
              } else if (isToday) {
                dayClasses = "bg-blue-50 dark:bg-sky-950/60 text-blue-600 dark:text-sky-300 border-2 border-blue-500 dark:border-sky-400 font-black shadow-sm";
              } else if (isHoliday) {
                dayClasses = "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-2 border-amber-400/60 shadow-sm";
              }

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                      relative h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200
                      ${dayClasses}
                  `}
                  title={specialDay ? `${specialDay.type}: ${dateKey}` : isHoliday ? "Sărbătoare Legală în România 🇷🇴" : undefined}
                >
                  <span className="relative z-10">{date.getDate()}</span>
                  {hasData && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full absolute bottom-1.5 shadow-sm"></div>
                  )}
                  {specialDay && !hasData && (
                    <span className="text-[7px] font-black absolute top-0.5 left-1 tracking-tighter opacity-90 uppercase">
                      {specialDay.type}
                    </span>
                  )}
                  {isHoliday && (
                    <>
                      <span className="text-[9px] absolute top-0.5 right-0.5" title="Sărbătoare Legală">🇷🇴</span>
                      {/* Marcaj Tricolor Românesc */}
                      <div className="absolute bottom-0 inset-x-1.5 h-1 rounded-full flex overflow-hidden shadow-sm" title="Tricolor Românesc 🇷🇴">
                        <span className="w-1/3 bg-[#002B7F]"></span>
                        <span className="w-1/3 bg-[#FCD116]"></span>
                        <span className="w-1/3 bg-[#CE1126]"></span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Selected Day Details Card - Only shows when a date is selected */}
      {selectedDate && (
        <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] overflow-hidden animate-slide-up shadow-md dark:shadow-black/40 backdrop-blur-xl mx-2 mt-4 p-5 relative z-20">
          <div className="border-b border-gray-100 dark:border-white/10 pb-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                  {selectedDate.toLocaleDateString("ro-RO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                {selectedSpecialDay && (
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedSpecialDay.type === 'CO'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : selectedSpecialDay.type === 'CM'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                  }`}>
                    {selectedSpecialDay.type === 'CO' ? '🏖️ Concediu Odihnă' : selectedSpecialDay.type === 'CM' ? '🏥 Concediu Medical' : '🔄 Recuperare'}
                  </span>
                )}
              </div>
            </div>
            {selectedDaySummary && (
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Total</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">
                  {formatHoursMinutes(selectedDaySummary.totalHours)}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-4">
            {/* 1. SECȚIUNE MARCARE ZI SPECIALĂ: CO, CM, REC */}
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                Marchează Ziua în Pontaj:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleToggleSpecialDay('CO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                    selectedSpecialDay?.type === 'CO'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <span>🏖️</span>
                  <span>Concediu Odihnă (CO)</span>
                  {selectedSpecialDay?.type === 'CO' && <Check size={14} />}
                </button>

                <button
                  onClick={() => handleToggleSpecialDay('CM')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                    selectedSpecialDay?.type === 'CM'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <span>🏥</span>
                  <span>Concediu Medical (CM)</span>
                  {selectedSpecialDay?.type === 'CM' && <Check size={14} />}
                </button>

                <button
                  onClick={() => handleToggleSpecialDay('RECUPERARE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                    selectedSpecialDay?.type === 'RECUPERARE'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                  }`}
                >
                  <span>🔄</span>
                  <span>Recuperare</span>
                  {selectedSpecialDay?.type === 'RECUPERARE' && <Check size={14} />}
                </button>
              </div>
            </div>

            {/* 2. SECȚIUNE SCHIMBURI: SCHIMBUL 1 & SCHIMBUL 2 */}
            <div className="p-3 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                <span>Înregistrează Tură pentru această zi:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* SCHIMBUL 1 */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDate) {
                      const s1 = SHIFT_PRESETS[0];
                      handleApplyPreset(s1);
                    }
                  }}
                  className="p-3 rounded-xl bg-white dark:bg-white/10 border border-amber-200 dark:border-amber-700/40 hover:border-amber-400 text-left transition-all active:scale-95 shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🌅</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      1-Click
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 block">
                    Schimbul 1 (06:30 – 16:30)
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    8h normă + 1.5h suplimentare
                  </span>
                </button>

                {/* SCHIMBUL 2 */}
                <button
                  type="button"
                  onClick={() => setShowShift2Modal(true)}
                  className="p-3 rounded-xl bg-white dark:bg-white/10 border border-indigo-200 dark:border-indigo-700/40 hover:border-indigo-400 text-left transition-all active:scale-95 shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🌙</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      Flexibil
                    </span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block">
                    Schimbul 2 (16:30 ➔ plecare)
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    Alege ora când ai plecat ➜
                  </span>
                </button>
              </div>

              {/* Opțiune Sch. 1 scurt */}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDate) {
                      const s1Scurt = SHIFT_PRESETS[1];
                      handleApplyPreset(s1Scurt);
                    }
                  }}
                  className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline"
                >
                  ☀️ Schimbul 1 fără suplimentare (06:30 – 15:00)
                </button>
              </div>
            </div>

            {/* 3. BUTON ADĂUGARE MANUALĂ CU ORE PERSONALIZATE */}
            <button
              onClick={() => {
                setEditingSessionId(null);
                setErrorMessage("");
                setStartHour("06");
                setStartMinute("30");
                setEndHour("15");
                setEndMinute("00");
                setShowAddModal(true);
              }}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-2xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Adaugă Sesiune Manual (Ore Personalizate)</span>
            </button>
            {selectedDaySummary ? (
              <div className="space-y-4">
                {/* Stats */}
                {settings.hasNoLimit && (
                  <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/5 mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5 font-bold">
                      Venit Estimat
                    </span>
                    <span className="text-lg font-black text-gray-900 dark:text-white">
                      {selectedDaySummary.dailyPay.toLocaleString("ro-RO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {settings.currency}
                    </span>
                  </div>
                )}

                {/* Session List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Sesiuni Înregistrate
                  </h4>
                  <ul className="space-y-2.5">
                    {selectedDaySummary.sessions.map((session, index) => {
                      const sStart = new Date(session.startTime);
                      const sEnd = new Date(session.endTime);
                      const isOvernight = sEnd.getDate() !== sStart.getDate() ||
                        (sEnd.getTime() - sStart.getTime() > 18 * 3600000);

                      return (
                        <li
                          key={session.id || index}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl transition-all group"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                                Sesiunea {index + 1}
                              </span>
                              {isOvernight && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  🌙 Tură de noapte (+1 zi)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span className="text-lg font-black tracking-tight">
                                {formatTime(sStart)} - {formatTime(sEnd)}
                              </span>
                              {isOvernight && (
                                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                                  (+1 zi)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                              Durată efectivă: {formatHoursMinutes(calculateDurationWithBreak(sStart, sEnd))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(session)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                              title="Editează sesiunea"
                              aria-label="Editează sesiunea"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                onDeleteSession(session.id || session.originalIndex);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                              title="Șterge sesiunea"
                              aria-label="Șterge sesiunea"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <p className="text-gray-900 dark:text-white font-bold text-base">Nicio sesiune înregistrată</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Nu există ore înregistrate pentru această zi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry / Edit Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => {
                setShowAddModal(false);
                setEditingSessionId(null);
              }}
            />
            <div className="relative bg-white dark:bg-[#132337] backdrop-blur-2xl rounded-[30px] shadow-2xl border border-gray-100 dark:border-white/15 p-6 w-full max-w-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingSessionId !== null ? "Editează Sesiune" : "Adaugă Sesiune"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSessionId(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                  aria-label="Închide fereastra"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-white/80 mb-4 font-medium bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10 text-center">
                📅 {selectedDate?.toLocaleDateString("ro-RO", { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              {/* Preseturi rapide în modal */}
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 block mb-1.5">
                  Alege Presetare Orară Rapidă:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStartHour("06");
                      setStartMinute("30");
                      setEndHour("16");
                      setEndMinute("30");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-[11px] font-bold text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 transition-all active:scale-95"
                  >
                    🌅 Sch. 1 (06:30 - 16:30)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartHour("06");
                      setStartMinute("30");
                      setEndHour("15");
                      setEndMinute("00");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-[11px] font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 transition-all active:scale-95"
                  >
                    ☀️ Sch. 1 scurt (06:30 - 15:00)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartHour("16");
                      setStartMinute("30");
                      setEndHour("02");
                      setEndMinute("00");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[11px] font-bold text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95"
                  >
                    🌙 Sch. 2 (16:30 - 02:00)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartHour("16");
                      setStartMinute("30");
                      setEndHour("01");
                      setEndMinute("00");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[11px] font-bold text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95"
                  >
                    🌙 Sch. 2 (16:30 - 01:00)
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Start Time Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Ora Început
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Ora de început"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const val = String(i).padStart(2, "0");
                        return <option key={val} value={val} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white">{val}</option>;
                      })}
                    </select>
                    <span className="text-2xl font-bold text-gray-400 dark:text-white/40 self-center">:</span>
                    <select
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Minutul de început"
                    >
                      {Array.from({ length: 12 }).map((_, i) => { // 0, 5, 10... 55
                        const val = String(i * 5).padStart(2, "0");
                        return <option key={val} value={val} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white">{val}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* End Time Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Ora Sfârșit
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Ora de sfârșit"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const val = String(i).padStart(2, "0");
                        return <option key={val} value={val} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white">{val}</option>;
                      })}
                    </select>
                    <span className="text-2xl font-bold text-gray-400 dark:text-white/40 self-center">:</span>
                    <select
                      value={endMinute}
                      onChange={(e) => setEndMinute(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Minutul de sfârșit"
                    >
                      {Array.from({ length: 12 }).map((_, i) => {
                        const val = String(i * 5).padStart(2, "0");
                        return <option key={val} value={val} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white">{val}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {preview && (
                  <div className={`p-4 rounded-xl border ${preview.isOvernight ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Durată calculată:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{preview.h}h {preview.m > 0 ? `${preview.m}m` : ''}</span>
                    </div>
                    {preview.isOvernight && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 p-2 rounded-lg mt-2">
                        <span>🌙</span>
                        <span>Tura de noapte (+1 zi)</span>
                      </div>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm rounded-xl flex items-center gap-2 font-bold">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleSaveManualSession}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-4 text-base"
                >
                  {editingSessionId !== null ? "Actualizează Sesiunea" : "Salvează Sesiunea"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 5. MODAL RAPORT PONTAJ LUNAR (PDF / EXCEL) */}
      <MonthlyReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        sessions={workSessions}
        year={currentMonth.getFullYear()}
        month={currentMonth.getMonth()}
        settings={settings}
      />

      {/* 6. MODAL SPECIAL SCHIMBUL 2 PENTRU ZIUA SELECTATĂ */}
      <Shift2Modal
        isOpen={showShift2Modal}
        onClose={() => setShowShift2Modal(false)}
        targetDate={selectedDate || new Date()}
        onSaveSession={(newSession) => {
          onAddSession(newSession);
        }}
        isToday={areDatesEqual(selectedDate, new Date())}
      />
    </div>
  );
};