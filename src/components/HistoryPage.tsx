import React, { useMemo, useState, useEffect } from "react";
import type { WorkSession, AppSettings } from "../types";
import {
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Plus,
} from "lucide-react";
import {
  calculateEffectiveHourlyRate,
  calculateSalary,
  roundEntryTime,
  roundExitTime,
  splitSessionByDay,
} from "../utils/timeRounding";
import { getLocalISODate } from '../utils/dateUtils';

interface HistoryPageProps {
  workSessions: WorkSession[];
  settings: AppSettings;
  todaySessions: WorkSession[];
  formatHoursMinutes: (hours: number) => string;
  onDeleteSession: (index: number) => void;
  onAddSession: (session: WorkSession) => void;
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
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter States
  const [filterStartDate] = useState("");
  const [filterEndDate] = useState("");
  const [filterType] = useState<"all" | "normal" | "overtime">(
    "all"
  );

  // Manual Entry Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");
  const [errorMessage, setErrorMessage] = useState("");

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
      // split session across days, so each date gets its portion
      const segments = splitSessionByDay({ startTime: new Date(session.startTime), endTime: new Date(session.endTime) });
      for (const seg of segments) {
        const d = new Date(seg.startTime);

        // --- DATE RANGE FILTER ---
        if (startFilter && d < startFilter) continue;
        if (endFilter && d > endFilter) continue;

        const key = getDateKey(d);

        if (!map.has(key)) {
          map.set(key, {
            // Use local ISO date string instead of UTC-shifted toISOString()
            date: getLocalISODate(d),
            sessions: [],
            totalHours: 0,
            normalHours: 0,
            overtimeHours: 0,
            dailyPay: 0,
          });
        }
        // Attach original index to the segment
        map.get(key)!.sessions.push({ ...seg, originalIndex: index });
      }
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
      const totalMilliseconds = summary.sessions.reduce(
        (acc, s) =>
          acc +
          (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()),
        0
      );
      const totalHours = totalMilliseconds / (1000 * 60 * 60);

      summary.totalHours = totalHours;

      const dayOfWeek = new Date(summary.date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Check for holiday
      const dateKey = summary.date.split('T')[0];
      const isHoliday = settings.legalHolidays?.includes(dateKey);

      if (isWeekend || isHoliday) {
        // Toate orele din zi de weekend sau sărbătoare legală sunt ore suplimentare
        summary.normalHours = 0;
        summary.overtimeHours = totalHours;
        const salaryCalc = calculateSalary(0, summary.overtimeHours, effectiveRate, settings.overtimeMultiplier ?? 1);
        summary.dailyPay = salaryCalc.totalPay;
      } else if (settings.hasNoLimit) {
        summary.normalHours = totalHours;
        summary.overtimeHours = 0;
        summary.dailyPay = totalHours * effectiveRate;
      } else {
        summary.normalHours = Math.min(totalHours, settings.normalHoursLimit);
        summary.overtimeHours = Math.max(0, totalHours - settings.normalHoursLimit);
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

    let finalStart = start;
    let finalEnd = end;

    // Apply rounding rules ONLY if limits are active
    if (!settings.hasNoLimit) {
      finalStart = roundEntryTime(start);
      finalEnd = roundExitTime(end);
    }

    // Validate again after rounding
    if (finalEnd <= finalStart) {
      setErrorMessage("După rotunjire, durata sesiunii este 0 sau negativă.");
      return;
    }

    onAddSession({
      startTime: finalStart,
      endTime: finalEnd,
    });

    // Reset and close
    setShowAddModal(false);
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
      {/* HEADER - Blue Gradient Restored */}
      <header className="px-6 pt-12 pb-10 mb-[-20px] relative z-0 header-gradient-bg rounded-b-[30px] shadow-lg -mx-4">
        <h1 className="text-3xl font-black mb-1 tracking-tight text-white drop-shadow-sm">
          Istoric
        </h1>
        <p className="text-sm font-medium opacity-90 text-white">
          {settings.userName || 'Florin'}, O zi bună începe cu o cafea și un plan bun. 📝
        </p>
      </header>

      {/* 1. Grand Summary Card - Natural Flow (No Negative Margin) */}
      <div className="card-v6 p-6 rounded-[30px] shadow-xl dark:shadow-black/50 relative overflow-hidden mx-4 mb-8 transition-all duration-300 z-20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white text-shadow-sm tracking-wide">
            {hasActiveFilters ? "Total (Filtrat)" : "Total General"}
          </h2>
        </div>

        <div className="text-center p-3 relative z-10">
          <p className="text-4xl font-black text-white text-shadow-sm">
            {formatHoursMinutes(grandTotals.total)}
          </p>
          <p className="text-sm font-medium text-white/80 mt-1">Total Ore</p>
        </div>
      </div>

      {/* 2. Calendar - Blue Gradient Background */}
      <div className="card-v6 backdrop-blur-xl border border-white/20 p-6 rounded-[30px] shadow-xl dark:shadow-black/50 mx-2 transition-all duration-300 relative overflow-hidden z-10">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all text-white backdrop-blur-sm shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <h3 className="font-bold text-xl text-white capitalize tracking-wide text-shadow-sm">
            {getMonthName(currentMonth)}
          </h3>

          <button
            onClick={handleNextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all text-white backdrop-blur-sm shadow-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Grid */}
        <div className="relative z-10">
          <div className="grid grid-cols-7 mb-4">
            {weekDays.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="h-8 flex items-center justify-center text-sm font-bold text-white/90"
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

              // Priority Logic:
              // 1. Has Data -> RED (Always)
              // 2. Selected (No Data) -> GREEN
              // 3. Today -> White (Blue Text)
              // 4. Highlighted (Holiday) -> Red Tint
              // 5. Default -> White Text (on Blue Gradient)

              let dayClasses = "text-white hover:bg-white/10"; // Default

              if (hasData) {
                dayClasses = "bg-[#FF3B30] text-white shadow-lg border border-red-500/50 relative overflow-hidden";
              } else if (isSelected) {
                dayClasses = "bg-[#2ECC71] text-white shadow-lg scale-105 rounded-full ring-4 ring-white/20"; // Green for Selected Empty
              } else if (isToday) {
                dayClasses = "bg-white text-[#0072FF] shadow-md font-extrabold border-2 border-white";
              } else if (isHoliday) {
                dayClasses = "bg-red-500/30 text-white border border-red-400/50";
              }

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                      relative h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-300
                      ${dayClasses}
                  `}
                >
                  <span>{date.getDate()}</span>
                  {hasData && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full absolute bottom-1.5 shadow-sm"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>



      {/* 3. Selected Day Details Card - Only shows when a date is selected */}
      {/* 3. Selected Day Details Card - Blue Gradient + Black Text */}
      {selectedDate && (
        <div className="card-v6 rounded-[30px] overflow-hidden animate-slide-up shadow-xl dark:shadow-black/50 mx-2 mt-6 relative z-20">
          <div className="p-4 border-b border-black/10 bg-white/10 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-black capitalize text-shadow-none">
                {selectedDate.toLocaleDateString("ro-RO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
            </div>
            {selectedDaySummary && (
              <div className="text-right">
                <p className="text-xs text-black/70 font-semibold">Total</p>
                <p className="text-lg font-black text-black">
                  {formatHoursMinutes(selectedDaySummary.totalHours)}
                </p>
              </div>
            )}
          </div>

          <div className="p-4">
            {/* Add Session Button */}
            <button
              onClick={() => {
                setErrorMessage("");
                setStartHour("09");
                setStartMinute("00");
                setEndHour("17");
                setEndMinute("00");
                setShowAddModal(true);
              }}
              className="w-full mb-6 py-3 bg-[#2ECC71] text-white font-bold rounded-[20px] shadow-lg shadow-green-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#27AE60] border border-white/20"
            >
              <Plus className="w-5 h-5" />
              Adaugă Sesiune Manual
            </button>
            {selectedDaySummary ? (
              <div className="space-y-6">
                {/* Stats */}
                {settings.hasNoLimit && (
                  <div className="bg-white/60 backdrop-blur-md p-3 rounded-lg border border-white/40 mb-4 shadow-sm">
                    <span className="text-xs text-gray-800 block mb-1 font-bold">
                      Venit Estimat
                    </span>
                    <span className="text-lg font-black text-black">
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
                  <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-black" />
                    Sesiuni Înregistrate
                  </h4>
                  <ul className="space-y-2">
                    {selectedDaySummary.sessions.map((session, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-4 bg-white/40 backdrop-blur-md border border-white/50 shadow-sm rounded-2xl hover:bg-white/60 transition-all duration-200 group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-black/70 uppercase tracking-wider">
                            Sesiunea {index + 1}
                          </span>
                          <div className="flex items-center gap-2 text-black">
                            <Clock className="w-5 h-5 text-black" />
                            <span className="text-xl font-black tracking-tight">
                              {formatTime(new Date(session.startTime))} - {formatTime(new Date(session.endTime))}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onDeleteSession(session.originalIndex);
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Șterge sesiunea"
                          aria-label="Șterge sesiunea"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30 text-black">
                  <CalendarIcon className="w-8 h-8 text-black/50" />
                </div>
                <p className="text-black font-black text-lg">Nicio sesiune înregistrată</p>
                <p className="text-sm text-black/60 mt-1 font-medium">
                  Nu există ore înregistrate pentru această zi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-[30px] shadow-2xl border border-white/20 p-6 w-full max-w-sm animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  Adaugă Sesiune
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
                  aria-label="Închide fereastra"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-white/80 mb-6 font-medium bg-white/10 p-3 rounded-xl border border-white/10 text-center">
                📅 {selectedDate?.toLocaleDateString("ro-RO", { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>

              <div className="space-y-4">
                {/* Start Time Selector */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Ora Început
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full p-3 bg-white text-slate-800 border-none rounded-xl focus:ring-4 focus:ring-white/30 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Ora de început"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const val = String(i).padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                    <span className="text-2xl font-bold text-white/50 self-center">:</span>
                    <select
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      className="w-full p-3 bg-white text-slate-800 border-none rounded-xl focus:ring-4 focus:ring-white/30 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Minutul de început"
                    >
                      {Array.from({ length: 12 }).map((_, i) => { // 0, 5, 10... 55
                        const val = String(i * 5).padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* End Time Selector */}
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Ora Sfârșit
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full p-3 bg-white text-slate-800 border-none rounded-xl focus:ring-4 focus:ring-white/30 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Ora de sfârșit"
                    >
                      {Array.from({ length: 24 }).map((_, i) => {
                        const val = String(i).padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                    <span className="text-2xl font-bold text-white/50 self-center">:</span>
                    <select
                      value={endMinute}
                      onChange={(e) => setEndMinute(e.target.value)}
                      className="w-full p-3 bg-white text-slate-800 border-none rounded-xl focus:ring-4 focus:ring-white/30 focus:outline-none font-mono text-lg appearance-none font-bold text-center"
                      aria-label="Minutul de sfârșit"
                    >
                      {Array.from({ length: 12 }).map((_, i) => {
                        const val = String(i * 5).padStart(2, "0");
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {preview && (
                  <div className={`p-4 rounded-xl border ${preview.isOvernight ? 'bg-purple-500/20 border-purple-300/30' : 'bg-white/10 border-white/20'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white/80 font-medium">Durată calculată:</span>
                      <span className="text-lg font-bold text-white">{preview.h}h {preview.m > 0 ? `${preview.m}m` : ''}</span>
                    </div>
                    {preview.isOvernight && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-200 bg-purple-500/20 p-2 rounded-lg mt-2">
                        <span>🌙</span>
                        <span>Tura de noapte (+1 zi)</span>
                      </div>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 text-white text-sm rounded-xl flex items-center gap-2 font-bold shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]" />
                    {errorMessage}
                  </div>
                )}

                {!settings.hasNoLimit && (
                  <p className="text-xs text-white/70 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
                    ℹ️ Se vor aplica regulile automate de rotunjire (intrare: 30min, ieșire: oră fixă).
                  </p>
                )}

                <button
                  onClick={handleSaveManualSession}
                  className="w-full py-4 bg-white text-blue-600 font-[800] rounded-xl shadow-xl shadow-black/10 active:scale-95 transition-all mt-4 text-lg hover:bg-white/90"
                >
                  Salvează Sesiunea
                </button>
              </div>
            </div>
          </div>
        )}
    </div >
  );
};