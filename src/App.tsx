import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import {
  Clock,
  Home,
  History,
  Settings as SettingsIcon,
  Calculator,
  Zap, // Lightning icon for Overtime
  Square,
  RotateCw
} from "lucide-react";
import { ChartCard } from "./components/ChartCard";
import { HistoryPage } from "./components/HistoryPage";
import { SettingsPage } from "./components/SettingsPage";
import { CalculatorPage } from "./components/CalculatorPage";
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
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative ${isActive ? "text-blue-400 scale-110" : "text-gray-400 hover:text-gray-200"
          }`}
      >
        <Icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-[10px] font-medium transition-all ${isActive ? "opacity-100" : "opacity-70"}`}>
          {label}
        </span>
        {/* Active Dot Indicator */}
        {isActive && (
          <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
        )}
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
    <div id="app-root" className="min-h-screen transition-colors duration-300 bg-[#F5F7FA] dark:bg-gray-900 pb-20">
      <div className={`max-w-[450px] mx-auto min-h-screen relative shadow-2xl overflow-hidden ${settings.theme === 'dark' ? 'bg-[#0D1B2A]' : 'bg-[#F5F7FA]'}`}>

        <div className="relative z-10 flex flex-col h-full min-h-screen">



          {/* MAIN CONTENT AREA */}
          <main className="flex-1 relative">
            {page === "home" && (
              <div className="animate-fade-in">
                {/* Header Info - Clean Gradient Banner */}
                <header className="px-6 pt-12 pb-7 header-gradient-bg rounded-b-[32px] shadow-lg text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                        Salut, {settings.userName || 'Alex'}! 👋
                      </h1>
                      <p className="text-white/90 font-medium text-xs sm:text-sm mt-1 capitalize">
                        {new Date().toLocaleDateString("ro-RO", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={handleHardRefresh}
                      title="Reîmprospătează aplicația (Curăță Cache)"
                      className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white backdrop-blur-md flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCw size={18} />
                    </button>
                  </div>
                </header>

                {/* Content Container with ample bottom padding for floating controls */}
                <div className="px-5 pt-5 pb-44 space-y-4">


                  {/* ROW 1: Monthly Stats (Normal & Overtime) */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Normal Hours */}
                    <div className="bg-gradient-to-br from-[#0284C7] to-[#0369A1] dark:from-[#0C3058] dark:to-[#082240] dark:border dark:border-sky-500/20 relative overflow-hidden rounded-[24px] p-5 shadow-lg shadow-sky-500/20 dark:shadow-none text-white flex flex-col justify-between min-h-[120px] transition-all">
                      <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                        <Clock size={48} className="text-white" />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100 dark:text-sky-300 mb-1">
                          ORE NORMALE
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {formatTime(currentMonthStats.totalNormal)}
                        </h3>
                      </div>
                    </div>

                    {/* Overtime Hours */}
                    <div className="bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] dark:from-[#3B1F75] dark:to-[#2A1556] dark:border dark:border-purple-500/20 relative overflow-hidden rounded-[24px] p-5 shadow-lg shadow-indigo-500/20 dark:shadow-none text-white flex flex-col justify-between min-h-[120px] transition-all">
                      <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                        <Zap size={48} className="text-white" />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-100 dark:text-purple-300 mb-1">
                          ORE SUPLIM.
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {formatTime(currentMonthStats.totalOvertime)}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: Tickets & Value (Wide Card) */}
                  <div className="bg-gradient-to-r from-[#0F766E] to-[#0D9488] dark:from-[#0A3D38] dark:to-[#072B28] dark:border dark:border-teal-500/20 relative overflow-hidden rounded-[24px] p-5 shadow-lg shadow-teal-500/20 dark:shadow-none text-white flex justify-between items-center min-h-[85px] transition-all">
                    {/* Left: Count */}
                    <div className="relative z-10">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-100 dark:text-teal-300 mb-1">
                        TICHETE MASĂ (L-V)
                      </p>
                      <h3 className="text-2xl font-black text-white flex items-baseline gap-1">
                        {currentMonthStats.ticketDaysCount}
                        <span className="text-sm font-bold text-teal-100 dark:text-teal-300"> Tichete</span>
                      </h3>
                    </div>

                    {/* Right: Value */}
                    <div className="text-right relative z-10">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-100 dark:text-teal-300 mb-1">
                        VALOARE TOTALĂ
                      </p>
                      <h3 className="text-2xl font-black text-white flex items-baseline justify-end gap-1">
                        {currentMonthStats.ticketDaysCount * (settings.mealTicketValue || 22)}
                        <span className="text-sm font-bold text-teal-100 dark:text-teal-300"> RON</span>
                      </h3>
                    </div>
                  </div>

                  {/* Quick Shift Presets on Home */}
                  <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[24px] p-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <Zap size={15} className="text-amber-500" />
                        <span>Înregistrează rapid tura de azi:</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">1-Click</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SHIFT_PRESETS.slice(0, 4).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            const newSession = createSessionFromPreset(preset, new Date());
                            handleManualAddSession(newSession);
                            addNotification(`Tura "${preset.shortName}" a fost salvată cu succes!`);
                          }}
                          className="py-2 px-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-gray-200/80 dark:border-white/10 hover:border-sky-400 text-left transition-all active:scale-95 shadow-2xs group"
                          title={preset.description}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{preset.icon}</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 truncate">
                              {preset.shortName}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                            {String(preset.startHour).padStart(2, '0')}:{String(preset.startMinute).padStart(2, '0')} - {String(preset.endHour).padStart(2, '0')}:{String(preset.endMinute).padStart(2, '0')}
                          </span>
                        </button>
                      ))}
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

          {/* START/STOP BUTTON (STICKY) */}
          {page === 'home' && (
            <div className="fixed bottom-[88px] left-0 right-0 z-40 flex justify-center w-full px-4 pointer-events-none">
              <div className="max-w-[420px] w-full flex justify-center pointer-events-auto">
                <button
                  onClick={handleStartStop}
                  className={`
                          flex items-center gap-3 px-8 py-3.5
                          rounded-full shadow-xl
                          transition-all duration-300
                          ${isWorking
                      ? 'bg-red-500 shadow-red-500/40 hover:bg-red-600'
                      : 'bg-[#10B981] shadow-emerald-500/40 hover:bg-[#059669] animate-glow-green'
                    }
                          hover:scale-105 active:scale-95
                      `}
                >
                  {isWorking ? <Square fill="white" size={18} /> : <Clock strokeWidth={2.5} size={22} className="text-white" />}
                  <span className="text-white font-bold text-base tracking-wide">
                    {isWorking ? "STOP MUNCĂ" : "START MUNCĂ"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM NAVIGATION (Floating Dark Navy) */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full px-4 pb-3 pointer-events-none">
            <div className="max-w-[420px] w-full pointer-events-auto bg-[#0D1B2A]/95 dark:bg-[#08121E]/95 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/10">
              <div className="flex items-center justify-around h-16 px-2">
                <NavItem id="home" label="Acasă" icon={Home} />
                <NavItem id="history" label="Istoric" icon={History} />
                <NavItem id="calculator" label="Calcul" icon={Calculator} />
                <NavItem id="settings" label="Setări" icon={SettingsIcon} />
              </div>
            </div>
          </div>

          {/* CONFIRMATION MODAL */}
          {showStopConfirmation && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
        </div>
      </div>
    </div>
  );
}; // End Component

export default App;
