import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Home,
  History,
  Settings as SettingsIcon,
  Calculator,
  Zap, // Lightning icon for Overtime
  Square,
} from "lucide-react";
import { ChartCard } from "./components/ChartCard";
import { HistoryPage } from "./components/HistoryPage";
import { SettingsPage } from "./components/SettingsPage";
import { CalculatorPage } from "./components/CalculatorPage";
import type { WorkSession, AppSettings } from "./types";
import {
  splitHoursByDay,
  splitSessionByDay,
  roundEntryTime, // P2: Use rounding utils
  roundExitTime   // P2: Use rounding utils
} from "./utils/timeRounding";
import { getLocalISODate } from './utils/dateUtils';
import { LEGAL_HOLIDAYS_2025 } from './utils/holidays';
import { useGeofencing } from './hooks/useGeofencing';
import { initializeNotifications, notifyZoneEntry, notifyZoneExit } from './services/notifications';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEYS = {
  SETTINGS: 'appSettings_v2',
  IS_WORKING: 'isWorking_v2',
  START_TIME: 'startTime_v2',
  WORK_SESSIONS: 'workSessions_v2'
};

const App: React.FC = () => {
  const [page, setPage] = useState<"home" | "history" | "settings" | "calculator">("home");
  const [isLoading, setIsLoading] = useState(true); // P3: Loading state for startup

  // --- STATE MANAGEMENT ---
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    normalHoursLimit: 8,
    hasNoLimit: false,
    hourlyRate: 0,
    currency: "RON",
    salaryMode: "monthly",
    monthlySalary: 7180,
    workingDaysPerMonth: 21,
    salaryIsGross: false,
    taxRatePercent: 0,
    overtimeMultiplier: 1,
    theme: 'light',
    legalHolidays: LEGAL_HOLIDAYS_2025,
    geofencingEnabled: false,
    geofenceRadius: 400,
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
        if (isWorkingVal) setIsWorking(JSON.parse(isWorkingVal));

        const { value: startTimeVal } = await Preferences.get({ key: STORAGE_KEYS.START_TIME });
        if (startTimeVal && JSON.parse(startTimeVal) !== null) setStartTime(new Date(JSON.parse(startTimeVal)));

        // 3. Load Sessions
        const { value: sessionsVal } = await Preferences.get({ key: STORAGE_KEYS.WORK_SESSIONS });
        if (sessionsVal) {
          const sessions = JSON.parse(sessionsVal).map((s: any) => ({
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            modeFlag: s.modeFlag ?? false,
          }));
          // Filter last 3 months
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          setWorkSessions(sessions.filter((s: WorkSession) => new Date(s.startTime) >= cutoffDate));
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

  // --- GEOFENCING ---
  const geofenceConfig = useMemo(() => ({
    latitude: settings.gateLatitude || 0,
    longitude: settings.gateLongitude || 0,
    radius: settings.geofenceRadius || 400,
    enabled: settings.geofencingEnabled || false,
  }), [settings.gateLatitude, settings.gateLongitude, settings.geofenceRadius, settings.geofencingEnabled]);

  useGeofencing(
    geofenceConfig,
    useCallback(() => {
      // Auto-Start logic
      if (!isWorking && settings.geofencingEnabled) {
        // P2: Apply rounding to auto-start? 
        // Typically Geofence events are precise. We can apply rounding when *saving* the session, or here.
        // Let's keep start exact for now, and round when stopping/saving?
        // Or if the rule is strict, we round the start time now. 
        // User said: "rotunjește intervalele... ex: 08:00, 08:30". 
        // If I arrive at 8:05, it counts as 8:30? (Penalty) or 8:00? (Benefit).
        // Let's use the exact time for Start, and simply record it. The Payment/History logic might handle rounding, 
        // OR we store rounded values. The 'roundEntryTime' / 'roundExitTime' utils imply we should store rounded.
        const now = new Date();
        const roundedStart = roundEntryTime(now); // Rounding applied
        setIsWorking(true);
        setStartTime(roundedStart);
        notifyZoneEntry(settings.userName || 'Prietene');
      }
    }, [isWorking, settings]),
    useCallback(() => {
      // Auto-Stop logic
      if (isWorking && settings.geofencingEnabled && startTime) {
        const now = new Date();
        const roundedEnd = roundExitTime(now); // Rounding applied
        setWorkSessions(prev => [...prev, { startTime: startTime, endTime: roundedEnd, modeFlag: settings.hasNoLimit }]);
        setIsWorking(false);
        setStartTime(null);
        notifyZoneExit(settings.userName || 'Prietene', startTime);
      }
    }, [isWorking, settings, startTime])
  );

  // --- HANDLERS ---
  const handleStartStop = () => {
    if (isWorking) setShowStopConfirmation(true);
    else {
      // Manual Start
      const now = new Date();
      const roundedStart = roundEntryTime(now); // Apply rounding
      setIsWorking(true);
      setStartTime(roundedStart);
    }
  };

  const confirmStop = () => {
    if (startTime) {
      const now = new Date();
      const roundedEnd = roundExitTime(now); // Apply rounding

      // Note: We do NOT deduct the break here in the raw session storage.
      // Usually breaks are deducted during *calculation* of paying hours, not by modifying the timestamps.
      // However, if the user sees "8 hours" in history, it should reflect the break deduction?
      // The `calculateNightHours` and other utils in HistoryPage likely iterate over these sessions.
      // The `calculateDurationWithBreak` util I added should be used in HistoryPage or wherever totals are summed.
      // We store the "Attendance Time" (Start -> End). Break is a deduction rule applied later.

      setWorkSessions((prev) => [
        ...prev,
        {
          startTime: startTime,
          endTime: roundedEnd,
          modeFlag: settings.hasNoLimit,
        },
      ]);
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
    // Manual add should also probably respect rounding? 
    // Usually manual entry via inputs gives exact 00/30/15 depending on UI.
    // We'll trust the input or apply rounding if needed.
    // The Modal uses `roundEntryTime` / `roundExitTime` inside HistoryPage potentially?
    // Let's enforce it here just in case, ensuring consistency.
    const rStart = roundEntryTime(session.startTime);
    const rEnd = roundExitTime(session.endTime);
    setWorkSessions(prev => [...prev, { startTime: rStart, endTime: rEnd, modeFlag: settings.hasNoLimit }]);
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
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      let dailyTotalHours = 0;

      // Sum stored sessions
      workSessions.forEach(s => {
        const segs = splitSessionByDay(s);
        segs.forEach(seg => {
          const segDate = new Date(seg.startTime);
          if (segDate.toDateString() === d.toDateString()) {
            dailyTotalHours += (new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 3600000;
          }
        });
      });

      // Add active session if "Same Day"
      if (isWorking && startTime) {
        const segs = splitSessionByDay({ startTime, endTime: currentTime });
        segs.forEach(seg => {
          const segDate = new Date(seg.startTime);
          if (segDate.toDateString() === d.toDateString()) {
            dailyTotalHours += (new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime()) / 3600000;
          }
        });
      }

      const { normalHours, overtimeHours } = splitHoursByDay(
        dailyTotalHours, d, settings.normalHoursLimit, settings.hasNoLimit, settings.legalHolidays
      );

      days.push({
        name: labels[i],
        fullDate: getLocalISODate(d),
        "Ore Normale": parseFloat(normalHours.toFixed(2)),
        "Ore Suplimentare": parseFloat(overtimeHours.toFixed(2))
      });
    }
    return days;
  }, [workSessions, isWorking, startTime, currentTime, weekOffset, settings]);

  // 2. Grand Totals (Monthly) for Cards
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalNormal = 0;
    let totalOvertime = 0;
    const uniqueDays = new Set<string>();
    const dailyMap: { [key: string]: number } = {};

    const addToMap = (start: Date, end: Date) => {
      const segs = splitSessionByDay({ startTime: start, endTime: end });
      segs.forEach(s => {
        if (new Date(s.startTime) >= startOfMonth) {
          const k = getLocalISODate(new Date(s.startTime));
          const h = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
          dailyMap[k] = (dailyMap[k] || 0) + h;
          uniqueDays.add(k);
        }
      });
    }

    workSessions.forEach(s => addToMap(new Date(s.startTime), new Date(s.endTime)));
    if (isWorking && startTime) addToMap(startTime, currentTime);

    Object.entries(dailyMap).forEach(([dateStr, hours]) => {
      const split = splitHoursByDay(hours, new Date(dateStr), settings.normalHoursLimit, settings.hasNoLimit, settings.legalHolidays);
      totalNormal += split.normalHours;
      totalOvertime += split.overtimeHours;
    });

    return { totalNormal, totalOvertime, daysWorked: uniqueDays.size };
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

  return (
    <div id="app-root" className="min-h-screen transition-colors duration-300 bg-[#F5F7FA] dark:bg-gray-900 pb-20">
      <div className={`max-w-[450px] mx-auto min-h-screen relative shadow-2xl overflow-hidden ${settings.theme === 'dark' ? 'bg-[#0D1B2A]' : 'bg-[#F5F7FA]'}`}>

        {/* GLOBAL HEADER BACKGROUND (Gradient) */}
        <div className="header-gradient-bg dark:opacity-20 transition-opacity duration-300"></div>

        <div className="relative z-10 flex flex-col h-full min-h-screen">

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 relative">
            {page === "home" && (
              <>
                <div className="px-6 pt-0 pb-24 space-y-6 animate-fade-in">
                  {/* Header Info - Blue Gradient Style */}
                  <header className="px-6 pt-12 pb-10 mb-6 relative z-0 header-gradient-bg rounded-b-[30px] shadow-lg -mx-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                          Salut, {settings.userName || 'Alex'}! 👋
                        </h1>
                        <p className="text-white/90 font-medium text-sm mt-1 opacity-90">
                          {new Date().toLocaleDateString("ro-RO", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </header>

                  {/* ROW 1: Monthly Stats (Normal & Overtime) */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Normal Hours */}
                    <div className="card-v6 aspect-square relative overflow-hidden rounded-[30px] p-6 flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Clock size={50} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-1">
                          ORE NORMALE
                        </p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {formatTime(currentMonthStats.totalNormal)}
                        </h3>
                      </div>
                    </div>

                    {/* Overtime Hours */}
                    <div className="card-v6 aspect-square relative overflow-hidden rounded-[30px] p-6 flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Zap size={50} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-1">
                          ORE SUPLIM.
                        </p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {formatTime(currentMonthStats.totalOvertime)}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: Tickets & Value (Wide Card) */}
                  <div className="card-v6 relative overflow-hidden rounded-[30px] p-6 flex justify-between items-center h-28">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Square size={80} className="text-white" />
                    </div>

                    {/* Left: Count */}
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-1">
                        TICHETE MASĂ
                      </p>
                      <h3 className="text-3xl font-black text-white flex items-baseline gap-1">
                        {currentMonthStats.daysWorked}
                        <span className="text-sm font-bold text-white/80"> Tichete</span>
                      </h3>
                    </div>

                    {/* Right: Value */}
                    <div className="text-right relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-1">
                        VALOARE TOTALĂ
                      </p>
                      <h3 className="text-3xl font-black text-white flex items-baseline justify-end gap-1">
                        {currentMonthStats.daysWorked * (settings.mealTicketValue || 0)}
                        <span className="text-sm font-bold text-white/80"> RON</span>
                      </h3>
                    </div>
                  </div>

                  {/* ROW 3: Chart Card */}
                  <ChartCard
                    title="SĂPTĂMÂNA CURENTĂ"
                    data={weeklyChartData}
                    hasNoLimit={settings.hasNoLimit}
                    onPrevWeek={() => setWeekOffset(w => w + 1)}
                    onNextWeek={() => setWeekOffset(w => w - 1)}
                    isDark={settings.theme === 'dark'}
                  />

                </div>
              </>
            )}

            {page === "history" && (
              <HistoryPage
                workSessions={workSessions}
                settings={settings}
                formatHoursMinutes={formatHoursMinutes}
                todaySessions={workSessions.filter(s => new Date(s.startTime).toDateString() === new Date().toDateString())}
                onAddSession={handleManualAddSession} // Use wrapper to apply rounding
                onDeleteSession={(index) => {
                  const newSessions = [...workSessions];
                  newSessions.splice(index, 1);
                  setWorkSessions(newSessions);
                }}
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
              />
            )}
          </main>

          {/* START/STOP BUTTON (STICKY) - PROPERLY MOVED OUTSIDE ANIMATED CONTAINER */}
          {page === 'home' && (
            <div className="fixed bottom-[98px] left-0 right-0 z-40 flex justify-center w-full px-6 pointer-events-none">
              <div className="max-w-md w-full flex justify-center pointer-events-auto">
                <button
                  onClick={handleStartStop}
                  className={`
                          flex items-center gap-3 px-10 py-4
                          rounded-full
                          transition-all duration-300
                          ${isWorking
                      ? 'bg-red-500 shadow-lg shadow-red-500/40' // Stop is Red
                      : 'bg-[#2ECC71] shadow-lg shadow-green-500/40 animate-glow-green' // Start is Vibrant Green
                    }
                          hover:scale-105 active:scale-95
                      `}
                >
                  {isWorking ? <Square fill="white" size={20} /> : <Clock strokeWidth={3} size={24} className="text-white" />}
                  <span className="text-white font-bold text-lg tracking-wide">
                    {isWorking ? "STOP MUNCĂ" : "START MUNCĂ"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM NAVIGATION (Floating Dark Navy v6.0.0) */}
          <div className="fixed bottom-0 left-0 right-0 z-50 m-[10px_15px]">
            <div className="bg-[#0D1B2A] rounded-[20px] shadow-2xl pb-0 transition-all duration-300 border border-white/5">
              <div className="flex items-center justify-around w-full h-16 px-2">
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
