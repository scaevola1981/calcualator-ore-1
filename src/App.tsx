import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import {
  Clock,
  Home,
  History,
  Settings as SettingsIcon,
  Calculator,
  Zap, // Lightning icon for Overtime
  Square,
  RotateCw,
  Play
} from "lucide-react";
import { ChartCard } from "./components/ChartCard";
import { HistoryPage } from "./components/HistoryPage";
import { SettingsPage } from "./components/SettingsPage";
import { CalculatorPage } from "./components/CalculatorPage";
import { Shift2Modal } from "./components/Shift2Modal";
import type { WorkSession, AppSettings } from "./types";
import {
  splitHoursByDay,
  calculateDurationWithBreak,
  roundEntryTime,
  roundExitTime
} from "./utils/timeRounding";
import { getLocalISODate } from './utils/dateUtils';
import { LEGAL_HOLIDAYS } from './utils/holidays';
import { initializeNotifications, scheduleShiftAlerts, cancelShiftAlerts } from './services/notifications';
import { SHIFT_PRESETS, createSessionFromPreset } from './utils/shiftPresets';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEYS = {
  SETTINGS: 'appSettings_v2',
  IS_WORKING: 'isWorking_v2',
  START_TIME: 'startTime_v2',
  WORK_SESSIONS: 'workSessions_v2'
};

const App: React.FC = () => {
  const [page, setPage] = useState<"home" | "history" | "settings" | "calculator">("home");
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE MANAGEMENT ---
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    normalHoursLimit: 8,
    hasNoLimit: false,
    hourlyRate: 26.25,
    currency: "RON",
    salaryMode: "monthly",
    monthlySalary: 4200,
    grossSalary: 7180,
    workingDaysPerMonth: 20,
    salaryIsGross: false,
    taxRatePercent: 0,
    overtimeMultiplier: 1,
    theme: 'light',
    legalHolidays: LEGAL_HOLIDAYS,
    userName: 'Dorobanțu Nicolae-Florin',
    employeeId: 'AFD1270',
    companyName: 'AVICARVIL FOOD & DISTRIBUTION',
    department: 'Întreținere și mentenanță',
    jobTitle: 'Lăcătuș mecanic',
    standardAdvance: 1500,
    mealTicketValue: 22,
    sporRegieFixed: 71.80,
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [isShift2ModalOpen, setIsShift2ModalOpen] = useState(false);

  // --- STARTUP LOGIC (P2 & P3) ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load Settings
        const { value: settingsVal } = await Preferences.get({ key: STORAGE_KEYS.SETTINGS });
        if (settingsVal) {
          const parsed = JSON.parse(settingsVal);
          setSettings(prev => ({ ...prev, ...parsed }));

          // Apply Theme Immediately to prevent flash
          if (parsed.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        // 2. Load State
        const { value: isWorkingVal } = await Preferences.get({ key: STORAGE_KEYS.IS_WORKING });
        const { value: startTimeVal } = await Preferences.get({ key: STORAGE_KEYS.START_TIME });
        let loadedStart: Date | null = null;
        if (startTimeVal && JSON.parse(startTimeVal) !== null) {
          loadedStart = new Date(JSON.parse(startTimeVal));
          setStartTime(loadedStart);
        }
        if (isWorkingVal) {
          const working = JSON.parse(isWorkingVal);
          setIsWorking(working);
          if (working && loadedStart) {
            scheduleShiftAlerts(settings.userName || 'Dorobanțu Nicolae-Florin', loadedStart);
          }
        }

        // 3. Load Sessions (Preserve complete history for reporting & backups)
        const { value: sessionsVal } = await Preferences.get({ key: STORAGE_KEYS.WORK_SESSIONS });
        if (sessionsVal) {
          const sessions = JSON.parse(sessionsVal).map((s: any) => ({
            id: s.id || `${new Date(s.startTime).getTime()}-${Math.random().toString(36).substring(2, 9)}`,
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            modeFlag: s.modeFlag ?? false,
          }));
          setWorkSessions(sessions);
        }

        // 4. Initialize Notifications ONCE (P3)
        initializeNotifications();

      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // --- PERSISTENCE EFFECTS (Sync on Change) ---
  useEffect(() => {
    if (isLoading) return; // Don't save defaults before loading
    Preferences.set({ key: STORAGE_KEYS.SETTINGS, value: JSON.stringify(settings) });
  }, [settings, isLoading]);

  useEffect(() => {
    if (isLoading) return; // Don't save defaults before loading
    Preferences.set({ key: STORAGE_KEYS.IS_WORKING, value: JSON.stringify(isWorking) });
    Preferences.set({ key: STORAGE_KEYS.START_TIME, value: JSON.stringify(startTime) });
  }, [isWorking, startTime, isLoading]);

  useEffect(() => {
    if (isLoading) return; // Don't save defaults before loading
    Preferences.set({ key: STORAGE_KEYS.WORK_SESSIONS, value: JSON.stringify(workSessions) });
  }, [workSessions, isLoading]);


  // --- TIMER ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- THEME TOGGLE (Runtime updates) ---
  useLayoutEffect(() => {
    if (isLoading) return; // Handled in loadData
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme, isLoading]);

  // --- REFS FOR GEOFENCING (Fresh State Access) ---
  const isWorkingRef = useRef(isWorking);
  const startTimeRef = useRef(startTime);
  const settingsRef = useRef(settings);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isWorkingRef.current = isWorking;
    startTimeRef.current = startTime;
    settingsRef.current = settings;
  }, [isWorking, startTime, settings]);



  // --- HANDLERS ---
  const handleStartStop = () => {
    if (isWorking) setShowStopConfirmation(true);
    else {
      // Manual Start
      const now = new Date();
      const roundedStart = roundEntryTime(now); // Apply rounding
      setIsWorking(true);
      setStartTime(roundedStart);
      if (settings.smartAlertsEnabled ?? true) {
        scheduleShiftAlerts(settings.userName || 'Dorobanțu Nicolae-Florin', roundedStart);
      }
    }
  };

  const confirmStop = () => {
    if (startTime) {
      const now = new Date();
      const roundedEnd = roundExitTime(now); // Apply rounding

      const newSession: WorkSession = {
        id: `${new Date(startTime).getTime()}-${Math.random().toString(36).substring(2, 9)}`,
        startTime: startTime,
        endTime: roundedEnd,
        modeFlag: settings.hasNoLimit,
      };

      cancelShiftAlerts();
      setWorkSessions((prev) => [...prev, newSession]);
      setStartTime(null);
      setIsWorking(false);
      setShowStopConfirmation(false);
    }
  };

  // --- MOCK NOTIFICATION HANDLER (for HistoryPage) ---
  const addNotification = useCallback((message: string) => {
    console.log("In-app notification:", message);
  }, []);

  const handleManualAddSession = (session: { startTime: Date; endTime: Date }) => {
    const rStart = roundEntryTime(session.startTime);
    const rEnd = roundExitTime(session.endTime);
    const newSession: WorkSession = {
      id: `${new Date(rStart).getTime()}-${Math.random().toString(36).substring(2, 9)}`,
      startTime: rStart,
      endTime: rEnd,
      modeFlag: settings.hasNoLimit,
    };
    setWorkSessions(prev => [...prev, newSession]);
  };

  const handleUpdateSession = (identifier: string | number, newStart: Date, newEnd: Date) => {
    const rStart = roundEntryTime(newStart);
    const rEnd = roundExitTime(newEnd);
    setWorkSessions(prev => prev.map((s, idx) => {
      const isMatch = (s.id && s.id === identifier) ||
                      idx === identifier ||
                      String(idx) === String(identifier) ||
                      (s.id && String(s.id) === String(identifier));
      if (isMatch) {
        return {
          ...s,
          startTime: rStart,
          endTime: rEnd,
        };
      }
      return s;
    }));
  };

  const handleDeleteSession = (identifier: string | number) => {
    setWorkSessions(prev => {
      if (typeof identifier === 'string') {
        return prev.filter(s => s.id !== identifier);
      }
      const newSessions = [...prev];
      newSessions.splice(identifier, 1);
      return newSessions;
    });
  };

  // --- CALCULATIONS ---
  // 1. Current Week Data for Chart
  const weeklyChartData = useMemo(() => {
    const days = [];
    const labels = ["L", "M", "M", "J", "V", "S", "D"];
    const now = new Date();
    // Calculate start of generic week (Monday) based on offset
    const currentDay = now.getDay(); // 0=Sun
    const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMon + (weekOffset * 7));
    monday.setHours(12, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      let dailyTotalHours = 0;

      // Sum stored sessions
      workSessions.forEach(s => {
        const sDate = new Date(s.startTime);
        if (sDate.toDateString() === d.toDateString()) {
          dailyTotalHours += calculateDurationWithBreak(new Date(s.startTime), new Date(s.endTime));
        }
      });

      // Add active session if shift started on this day
      if (isWorking && startTime) {
        const sDate = new Date(startTime);
        if (sDate.toDateString() === d.toDateString()) {
          dailyTotalHours += calculateDurationWithBreak(new Date(startTime), new Date(currentTime));
        }
      }

      const { normalHours, overtimeHours } = splitHoursByDay(
        dailyTotalHours, d, settings.normalHoursLimit, settings.hasNoLimit, settings.legalHolidays
      );

      days.push({
        name: `${labels[i]} ${d.getDate()}`,
        dayLetter: labels[i],
        dayDate: d.getDate(),
        fullDate: getLocalISODate(d),
        "Ore Normale": parseFloat(normalHours.toFixed(2)),
        "Ore Suplimentare": parseFloat(overtimeHours.toFixed(2))
      });
    }
    return days;
  }, [workSessions, isWorking, startTime, currentTime, weekOffset, settings]);

  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMon + (weekOffset * 7));
    monday.setHours(12, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = monthNames[monday.getMonth()];
    const endMonth = monthNames[sunday.getMonth()];

    const rangeStr = startMonth === endMonth
      ? `${startDay} - ${endDay} ${startMonth}`
      : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

    let title = "SĂPTĂMÂNA CURENTĂ";
    if (weekOffset === -1) title = "SĂPTĂMÂNA PRECEDENTĂ";
    else if (weekOffset < -1) title = `ACUM ${Math.abs(weekOffset)} SĂPTĂMÂNI`;
    else if (weekOffset === 1) title = "SĂPTĂMÂNA VIITOARE";
    else if (weekOffset > 1) title = `PESTE ${weekOffset} SĂPTĂMÂNI`;

    let totalNormal = 0;
    let totalOvertime = 0;
    weeklyChartData.forEach(d => {
      totalNormal += d["Ore Normale"] || 0;
      totalOvertime += d["Ore Suplimentare"] || 0;
    });

    return {
      title,
      subtitle: rangeStr,
      totalNormal,
      totalOvertime,
      totalHours: totalNormal + totalOvertime,
      isCurrentWeek: weekOffset === 0,
    };
  }, [weekOffset, weeklyChartData]);

  // 2. Grand Totals (Monthly) for Cards
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalNormal = 0;
    let totalOvertime = 0;
    const uniqueDays = new Set<string>();
    const ticketDays = new Set<string>();
    const dailyMap: { [key: string]: number } = {};

    const addToMap = (start: Date, end: Date) => {
      const sDate = new Date(start);
      if (sDate >= startOfMonth) {
        const k = getLocalISODate(sDate);
        const h = calculateDurationWithBreak(new Date(start), new Date(end));
        dailyMap[k] = (dailyMap[k] || 0) + h;
        uniqueDays.add(k);

        // Condiție strictă tichete: exclusiv Luni-Vineri care NU sunt sărbători legale
        const dayOfWeek = sDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = (settings.legalHolidays || []).includes(k);
        if (!isWeekend && !isHoliday && h > 0) {
          ticketDays.add(k);
        }
      }
    };

    workSessions.forEach(s => addToMap(new Date(s.startTime), new Date(s.endTime)));
    if (isWorking && startTime) addToMap(startTime, currentTime);

    Object.entries(dailyMap).forEach(([dateStr, hours]) => {
      const split = splitHoursByDay(hours, new Date(dateStr), settings.normalHoursLimit, settings.hasNoLimit, settings.legalHolidays);
      totalNormal += split.normalHours;
      totalOvertime += split.overtimeHours;
    });

    return { totalNormal, totalOvertime, daysWorked: uniqueDays.size, ticketDaysCount: ticketDays.size };
  }, [workSessions, isWorking, startTime, currentTime, settings]);

  // Helper
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatHoursMinutes = (hoursDecimal: number) => {
    if (isNaN(hoursDecimal) || hoursDecimal < 0) return "0h 00m";
    const totalMinutes = Math.round(hoursDecimal * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

  // --- RENDER HELPERS ---
  const NavItem = ({ id, label, icon: Icon }: { id: typeof page; label: string; icon: any }) => {
    const isActive = page === id;
    return (
      <button
        onClick={() => setPage(id)}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 sm:px-2 rounded-2xl transition-all duration-200 relative ${
          isActive
            ? "nm-nav-active font-black scale-105"
            : "text-[var(--nm-text-muted)] hover:text-[var(--nm-text)] active:scale-95"
        }`}
      >
        <Icon size={isActive ? 21 : 19} strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-black" : "font-medium"}`}>
          {label}
        </span>
      </button>
    );
  };

  // Prevent render until loaded (Prevents Flash of White/Unstyled Content to some degree, or at least wrong theme)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center">
        {/* Simple Loading Spinner */}
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleHardRefresh = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {
      console.warn('Hard refresh error:', e);
    }
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl + '?ts=' + Date.now();
  };

  return (
    <div id="app-root" className="min-h-screen transition-colors duration-300 bg-[var(--nm-bg)] pb-20">
      <div className="max-w-[450px] mx-auto min-h-screen relative shadow-2xl overflow-hidden bg-[var(--nm-bg)]">

        <div className="relative z-10 flex flex-col h-full min-h-screen">

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 relative">
            {page === "home" && (
              <div className="animate-fade-in">
                {/* Neo-Skeuomorphic Header Deck */}
                <header className="px-6 header-safe-top pb-6 nm-card !rounded-t-none !rounded-b-[32px] border-t-0 -mx-1 relative z-20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-[var(--nm-text)] tracking-tight">
                        Salut, {settings.userName || 'Florin'}! 👋
                      </h1>
                      <div className="nm-inset px-3 py-1 mt-2 inline-flex items-center gap-2">
                        <span className="nm-led nm-led-green"></span>
                        <p className="text-xs font-bold text-[var(--nm-text-muted)] capitalize">
                          {new Date().toLocaleDateString("ro-RO", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleHardRefresh}
                      title="Reîmprospătează aplicația (Curăță Cache)"
                      className="nm-btn-round"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>
                </header>

                {/* Content Container with ample bottom padding for floating controls */}
                <div className="px-5 pt-5 pb-28 space-y-4">

                  {/* ROW 1: Monthly Stats (Normal & Overtime) */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Normal Hours */}
                    <div className="nm-card p-4 sm:p-5 flex flex-col justify-between min-h-[125px] relative group">
                      <div className="flex items-center justify-between">
                        <div className="nm-inset-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Ore Normale
                        </div>
                        <div className="nm-inset w-8 h-8 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-inner">
                          <Clock size={16} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[var(--nm-text)]">
                          {formatTime(currentMonthStats.totalNormal)}
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--nm-text-muted)] uppercase tracking-wider mt-0.5">
                          Luna Curentă
                        </p>
                      </div>
                    </div>

                    {/* Overtime Hours */}
                    <div className="nm-card p-4 sm:p-5 flex flex-col justify-between min-h-[125px] relative group">
                      <div className="flex items-center justify-between">
                        <div className="nm-inset-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Ore Suplim.
                        </div>
                        <div className="nm-inset w-8 h-8 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
                          <Zap size={16} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
                          {formatTime(currentMonthStats.totalOvertime)}
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--nm-text-muted)] uppercase tracking-wider mt-0.5">
                          Luna Curentă
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: Tickets & Value (Wide Neumorphic Card) */}
                  <div className="nm-card p-4 sm:p-5 flex justify-between items-center min-h-[85px]">
                    {/* Left: Count */}
                    <div>
                      <div className="nm-inset-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 inline-block mb-1">
                        Tichete Masă (L-V)
                      </div>
                      <h3 className="text-2xl font-black font-mono text-[var(--nm-text)] flex items-baseline gap-1.5">
                        {currentMonthStats.ticketDaysCount}
                        <span className="text-xs font-bold text-[var(--nm-text-muted)]">Tichete</span>
                      </h3>
                    </div>

                    {/* Right: Value */}
                    <div className="text-right">
                      <div className="nm-inset-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 inline-block mb-1">
                        Valoare Totală
                      </div>
                      <h3 className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-baseline justify-end gap-1.5">
                        {currentMonthStats.ticketDaysCount * (settings.mealTicketValue || 22)}
                        <span className="text-xs font-bold text-[var(--nm-text-muted)]">RON</span>
                      </h3>
                    </div>
                  </div>

                  {/* Schimburile Reale: Schimbul 1 (06:30-16:30) & Schimbul 2 (16:30 -> flexibil) */}
                  <div className="nm-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[var(--nm-text)] flex items-center gap-1.5 uppercase tracking-wider">
                        <Zap size={15} className="text-amber-500" />
                        <span>Înregistrează tura de azi:</span>
                      </span>
                      <div className="nm-inset-sm px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--nm-text-muted)]">
                        2 Schimburi Fabrică
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* CARD SCHIMBUL 1 */}
                      <button
                        type="button"
                        onClick={() => {
                          const s1 = SHIFT_PRESETS[0]; // Schimbul 1 (06:30 - 16:30)
                          const newSession = createSessionFromPreset(s1, new Date());
                          handleManualAddSession(newSession);
                          addNotification("Schimbul 1 (06:30 – 16:30) înregistrat cu succes! (8h normă + 1.5h suplimentare)");
                        }}
                        className="nm-shift-card p-4 flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl drop-shadow-sm">🌅</span>
                          <div className="nm-inset-sm px-2 py-0.5 flex items-center gap-1.5">
                            <span className="nm-led nm-led-amber"></span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              1-Click Rapid
                            </span>
                          </div>
                        </div>

                        <h4 className="text-base font-black text-[var(--nm-text)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          Schimbul 1
                        </h4>

                        <div className="nm-inset px-2.5 py-1.5 my-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                            06:30 ➔ 16:30
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            8h + 1.5h
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--nm-text-muted)] font-medium leading-relaxed">
                          8h normă + 1.5h suplim. (pauză 30m inclusă)
                        </p>
                      </button>

                      {/* CARD SCHIMBUL 2 */}
                      <button
                        type="button"
                        onClick={() => setIsShift2ModalOpen(true)}
                        className="nm-shift-card p-4 flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl drop-shadow-sm">🌙</span>
                          <div className="nm-inset-sm px-2 py-0.5 flex items-center gap-1.5">
                            <span className="nm-led nm-led-indigo"></span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Oră Flexibilă
                            </span>
                          </div>
                        </div>

                        <h4 className="text-base font-black text-[var(--nm-text)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Schimbul 2
                        </h4>

                        <div className="nm-inset px-2.5 py-1.5 my-2 flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                            16:30 ➔ flexibil
                          </span>
                          <span className="text-[10px] font-bold text-indigo-500">
                            Alege ora ➜
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--nm-text-muted)] font-medium leading-relaxed">
                          Alege când ai plecat (01:00, 02:00 etc.) ➜
                        </p>
                      </button>
                    </div>

                    {/* Opțiuni suplimentare / pornire live Schimbul 2 */}
                    <div className="pt-3 border-t border-[var(--nm-border)] flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const start1630 = new Date();
                          start1630.setHours(16, 30, 0, 0);
                          setIsWorking(true);
                          setStartTime(start1630);
                          if (settings.smartAlertsEnabled ?? true) {
                            scheduleShiftAlerts(settings.userName || 'Dorobanțu Nicolae-Florin', start1630);
                          }
                          addNotification("Cronometru Schimbul 2 pornit live (start setat la 16:30)!");
                        }}
                        className="nm-btn py-1.5 px-3 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                      >
                        <span>▶️</span>
                        <span>Pornește Schimbul 2 live (de la 16:30)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const s1Scurt = SHIFT_PRESETS[1]; // Schimbul 1 scurt 06:30 - 15:00
                          const newSession = createSessionFromPreset(s1Scurt, new Date());
                          handleManualAddSession(newSession);
                          addNotification("Schimbul 1 scurt (06:30 – 15:00) înregistrat cu succes! (8h normă)");
                        }}
                        className="nm-btn py-1.5 px-3 rounded-xl text-xs font-bold text-[var(--nm-text-muted)] hover:text-[var(--nm-text)] flex items-center gap-1.5"
                      >
                        <span>☀️</span>
                        <span>Sch. 1 scurt (06:30 - 15:00)</span>
                      </button>
                    </div>
                  </div>

                  {/* ROW 3: Chart Card */}
                  <ChartCard
                    title={currentWeekInfo.title}
                    subtitle={currentWeekInfo.subtitle}
                    data={weeklyChartData}
                    hasNoLimit={settings.hasNoLimit}
                    onPrevWeek={() => setWeekOffset(w => w - 1)}
                    onNextWeek={() => setWeekOffset(w => Math.min(0, w + 1))}
                    isNextDisabled={weekOffset >= 0}
                    isDark={settings.theme === 'dark'}
                    weekTotals={{
                      normal: currentWeekInfo.totalNormal,
                      overtime: currentWeekInfo.totalOvertime,
                      total: currentWeekInfo.totalHours,
                    }}
                  />

                </div>
              </div>
            )}

            {page === "history" && (
              <HistoryPage
                workSessions={workSessions}
                settings={settings}
                formatHoursMinutes={formatHoursMinutes}
                todaySessions={workSessions.filter(s => new Date(s.startTime).toDateString() === new Date().toDateString())}
                onAddSession={handleManualAddSession} // Use wrapper to apply rounding
                onUpdateSession={handleUpdateSession}
                onDeleteSession={handleDeleteSession}
                addNotification={addNotification}
                onSettingsChange={setSettings}
              />
            )}

            {page === "calculator" && (
              <CalculatorPage settings={settings} onSettingsChange={setSettings} workSessions={workSessions} />
            )}

            {page === "settings" && (
              <SettingsPage
                settings={settings}
                onSettingsChange={setSettings}
                workSessions={workSessions}
                onSessionsChange={setWorkSessions}
              />
            )}
          </main>

          {/* BOTTOM NAVIGATION (Neo-Skeuomorphic Floating Dock with Integrated Start/Stop) */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full px-3 sm:px-4 bottom-nav-safe pointer-events-none">
            <div className="max-w-[430px] w-full pointer-events-auto nm-nav-dock">
              <div className="flex items-center justify-between h-16 px-1.5 sm:px-2">
                <NavItem id="home" label="Acasă" icon={Home} />
                <NavItem id="history" label="Istoric" icon={History} />

                {/* Master START / STOP Action Button */}
                <button
                  id="navbar-start-stop-btn"
                  onClick={handleStartStop}
                  title={isWorking ? "Oprește tura de muncă (STOP MUNCĂ)" : "Pornește tura de muncă (START MUNCĂ)"}
                  className={`
                    flex items-center justify-center gap-1.5 sm:gap-2
                    px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl
                    font-black text-[11px] sm:text-xs tracking-wider uppercase
                    transition-all duration-200 shadow-md active:scale-95 shrink-0 mx-0.5 sm:mx-1
                    ${isWorking ? 'nm-power-btn-stop animate-pulse' : 'nm-power-btn-start'}
                  `}
                >
                  {isWorking ? (
                    <Square fill="currentColor" size={13} className="shrink-0 text-white" />
                  ) : (
                    <Play fill="currentColor" size={13} className="shrink-0 text-white ml-0.5" />
                  )}
                  <span className="whitespace-nowrap text-white">
                    <span className="max-[359px]:hidden">{isWorking ? "STOP MUNCĂ" : "START MUNCĂ"}</span>
                    <span className="min-[360px]:hidden">{isWorking ? "STOP" : "START"}</span>
                  </span>
                </button>

                <NavItem id="calculator" label="Calcul" icon={Calculator} />
                <NavItem id="settings" label="Setări" icon={SettingsIcon} />
              </div>
            </div>
          </div>

          {/* CONFIRMATION MODAL */}
          {showStopConfirmation && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-safe-inset bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100">
                <h3 className="text-xl font-bold mb-2 text-center text-gray-900 dark:text-white">Oprești sesiunea?</h3>
                <p className="text-center text-gray-500 mb-6">Ai lucrat {formatTime((new Date().getTime() - (startTime?.getTime() || 0)) / 3600000)}.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowStopConfirmation(false)} className="py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Anulează
                  </button>
                  <button onClick={confirmStop} className="py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">
                    Oprește
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL SPECIAL PENTRU SCHIMBUL 2 */}
          <Shift2Modal
            isOpen={isShift2ModalOpen}
            onClose={() => setIsShift2ModalOpen(false)}
            targetDate={new Date()}
            onSaveSession={(newSession) => {
              handleManualAddSession(newSession);
              addNotification("Schimbul 2 salvat cu succes în pontaj!");
            }}
            isToday={true}
            onStartLiveTimerFrom1630={() => {
              const start1630 = new Date();
              start1630.setHours(16, 30, 0, 0);
              setIsWorking(true);
              setStartTime(start1630);
              if (settings.smartAlertsEnabled ?? true) {
                scheduleShiftAlerts(settings.userName || 'Dorobanțu Nicolae-Florin', start1630);
              }
              addNotification("Cronometru Schimbul 2 pornit live (start setat la 16:30)!");
            }}
          />
        </div>
      </div>
    </div>
  );
}; // End Component

export default App;
