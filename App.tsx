import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Briefcase, PlusCircle, Home, History, Settings as SettingsIcon, Calculator, TrendingUp } from 'lucide-react';
import { StatCard } from './components/StatCard';
import { ChartCard } from './components/ChartCard';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { SetupPage } from './components/SetupPage';
import { CalculatorPage } from './components/CalculatorPage';
import type { WorkSession } from './types';

// Helper function to apply theme to DOM and localStorage
const applyTheme = (theme: 'light' | 'dark') => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('appTheme', theme);
};


const App: React.FC = () => {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    return !!localStorage.getItem('userCredentials');
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('userCredentials') && sessionStorage.getItem('isAuthenticated') === 'true';
  });

  const [page, setPage] = useState<'home' | 'history' | 'settings' | 'calculator'>('home');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('appTheme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply theme on initial load
  useEffect(() => {
    applyTheme(theme);
  }, []); // Runs only once on mount

  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    if (newTheme === theme) return;
    applyTheme(newTheme);
    setTheme(newTheme);
  }, [theme]);


  const [isWorking, setIsWorking] = useState<boolean>(() => {
    const saved = localStorage.getItem('isWorking');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [startTime, setStartTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('startTime');
    return saved ? new Date(JSON.parse(saved)) : null;
  });

  const [workSessions, setWorkSessions] = useState<WorkSession[]>(() => {
    const saved = localStorage.getItem('workSessions');
    if (!saved) return [];
    const sessions: WorkSession[] = JSON.parse(saved).map((s: {startTime: string; endTime: string}) => ({
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime)
    }));
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    const recentSessions = sessions.filter(session => new Date(session.startTime) >= cutoffDate);
    return recentSessions;
  });
  
  const [settings, setSettings] = useState<{ normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; }>(() => {
    const saved = localStorage.getItem('appSettings');
    const defaults = { normalHoursLimit: 8, hasNoLimit: true, hourlyRate: 0, currency: 'EUR' as 'RON' | 'EUR' };
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
    return defaults;
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!settings.hasNoLimit && page === 'calculator') {
      setPage('home');
    }
  }, [settings.hasNoLimit, page]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save app settings:", error);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('isWorking', JSON.stringify(isWorking));
      localStorage.setItem('startTime', JSON.stringify(startTime));
    } catch (error) {
      console.error("Failed to save work state:", error);
    }
  }, [isWorking, startTime]);

  useEffect(() => {
    try {
      localStorage.setItem('workSessions', JSON.stringify(workSessions));
    } catch (error) {
      console.error("Failed to save work sessions:", error);
    }
  }, [workSessions]);

  const handleStartStop = useCallback(() => {
    if (isWorking) {
      if (startTime) {
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        // Round duration up to the nearest 30 minutes
        const totalMinutes = durationMs / (1000 * 60);
        const roundedTotalMinutes = Math.ceil(totalMinutes / 30) * 30;
        const roundedDurationMs = roundedTotalMinutes * 60 * 1000;

        // Calculate the new end time based on the rounded duration
        const roundedEndTime = new Date(startTime.getTime() + roundedDurationMs);

        setWorkSessions(prev => [...prev, { startTime, endTime: roundedEndTime }]);
      }
      setIsWorking(false);
      setStartTime(null);
    } else {
      setIsWorking(true);
      setStartTime(new Date());
    }
  }, [isWorking, startTime]);

  const { normalHours, overtimeHours } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = workSessions.filter(session => new Date(session.startTime) >= today);
    let totalMilliseconds = todaySessions.reduce((acc, session) => {
        return acc + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
    }, 0);
    if (isWorking && startTime && new Date(startTime) >= today) {
      totalMilliseconds += currentTime.getTime() - startTime.getTime();
    }
    const totalHoursCalc = totalMilliseconds / (1000 * 60 * 60);

    if (settings.hasNoLimit) {
      return { normalHours: totalHoursCalc, overtimeHours: 0 };
    }

    const normalHoursCalc = Math.min(totalHoursCalc, settings.normalHoursLimit);
    const overtimeHoursCalc = Math.max(0, totalHoursCalc - settings.normalHoursLimit);
    return {
      normalHours: normalHoursCalc,
      overtimeHours: overtimeHoursCalc,
    };
  }, [workSessions, isWorking, startTime, currentTime, settings]);

  const currentSessionDuration = useMemo(() => {
    if (isWorking && startTime) {
      return currentTime.getTime() - startTime.getTime();
    }
    return 0;
  }, [isWorking, startTime, currentTime]);
  
  const todayCompletedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return workSessions
        .filter(session => new Date(session.startTime) >= today)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [workSessions]);

  const weeklyChartData = useMemo(() => {
    const days = [];
    const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Luni -> Duminica

    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0=Duminica, 1=Luni...
    
    // Calculează data de Luni a săptămânii curente
    const monday = new Date(today);
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek; // Ajustare pentru Duminica
    monday.setDate(today.getDate() + diffToMonday);

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const isToday = dayStart.toDateString() === new Date().toDateString();

        const sessionsForDay = workSessions.filter(session => {
            const sessionStartTime = new Date(session.startTime);
            return sessionStartTime >= dayStart && sessionStartTime <= dayEnd;
        });

        let totalMilliseconds = sessionsForDay.reduce((acc, session) => {
            return acc + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
        }, 0);

        if (isToday && isWorking && startTime) {
            totalMilliseconds += currentTime.getTime() - startTime.getTime();
        }

        const totalHours = totalMilliseconds / (1000 * 60 * 60);
        
        let normalHoursValue = 0;
        let overtimeHoursValue = 0;

        if (settings.hasNoLimit) {
            normalHoursValue = totalHours;
        } else {
            normalHoursValue = Math.min(totalHours, settings.normalHoursLimit);
            overtimeHoursValue = Math.max(0, totalHours - settings.normalHoursLimit);
        }

        days.push({
            name: dayLabels[i],
            'Ore Normale': parseFloat(normalHoursValue.toFixed(2)),
            'Ore Suplimentare': parseFloat(overtimeHoursValue.toFixed(2)),
        });
    }

    return days;
  }, [workSessions, settings, isWorking, startTime, currentTime]);
    
  const totalHoursWorked = useMemo(() => {
      let totalMilliseconds = workSessions.reduce((acc, session) => {
          return acc + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
      }, 0);

      // Add current session if working
      if (isWorking && startTime) {
          totalMilliseconds += currentTime.getTime() - startTime.getTime();
      }
      
      return totalMilliseconds / (1000 * 60 * 60);
  }, [workSessions, isWorking, startTime, currentTime]);

  const formatDuration = (milliseconds: number) => {
    if(milliseconds < 0) milliseconds = 0;
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatHoursMinutes = (hoursDecimal: number) => {
    if (isNaN(hoursDecimal) || hoursDecimal < 0) {
      return '0m';
    }
    const totalMinutes = Math.round(hoursDecimal * 60);
    if (totalMinutes === 0) {
      return '0m';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let result = '';
    if (hours > 0) {
      result += `${hours}h`;
    }
    if (minutes > 0) {
      if (hours > 0) result += ' ';
      result += `${minutes}m`;
    }
    return result || '0m';
  };

  const NavButton = ({ active, onClick, children, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 w-full py-3 transition-colors ${
            active
                ? 'text-blue-600'
                : 'text-gray-500 dark:text-zinc-400'
        }`}
    >
        <Icon className={`w-6 h-6`} />
        <span className={`text-xs font-medium`}>{children}</span>
    </button>
  );

  const pageHeaders = {
    home: {
        title: 'Panou de control',
        subtitle: new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    },
    history: {
        title: 'Istoric',
        subtitle: 'Vizualizați activitatea trecută',
    },
    settings: {
        title: 'Setări',
        subtitle: 'Configurați aplicația',
    },
    calculator: {
        title: 'Calculator',
        subtitle: 'Estimați venitul total',
    },
  };

  const currentHeader = pageHeaders[page];

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = useCallback(() => {
      sessionStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
  }, []);

  if (!isSetupComplete) {
    return <SetupPage onSetupComplete={handleSetupComplete} />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-full w-full max-w-2xl mx-auto flex flex-col font-sans">
      <header className="px-4 pt-6 sm:px-6">
        <p className="text-gray-500 dark:text-zinc-400 text-sm font-semibold">{currentHeader.subtitle}</p>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{currentHeader.title}</h1>
      </header>

      <main className="flex-grow p-4 sm:p-6 space-y-4 overflow-y-auto pb-48">
        {page === 'home' && (
          <div className="space-y-4">
             <div className="space-y-4">
                <StatCard title={settings.hasNoLimit ? "Ore Lucrate Azi" : "Ore Normale Azi"} value={formatHoursMinutes(normalHours)} icon={<Briefcase className="w-6 h-6 text-blue-600" />} />
                
                {!settings.hasNoLimit && (
                    <StatCard title="Ore Suplim. Azi" value={formatHoursMinutes(overtimeHours)} icon={<PlusCircle className="w-6 h-6 text-orange-500" />} />
                )}

                {settings.hasNoLimit && (
                    <StatCard title="Total Ore (General)" value={formatHoursMinutes(totalHoursWorked)} icon={<TrendingUp className="w-6 h-6 text-green-600" />} />
                )}
            </div>
            
            <ChartCard title="Sumar Săptămânal" data={weeklyChartData} theme={theme} hasNoLimit={settings.hasNoLimit} />
          </div>
        )}
        {page === 'history' && <HistoryPage workSessions={workSessions} settings={settings} todaySessions={todayCompletedSessions} formatHoursMinutes={formatHoursMinutes} />}
        {page === 'settings' && <SettingsPage settings={settings} onSettingsChange={setSettings} theme={theme} onThemeChange={handleThemeChange} onLogout={handleLogout} />}
        {page === 'calculator' && <CalculatorPage totalHours={totalHoursWorked} settings={settings} onSettingsChange={setSettings} />}
      </main>

      {page === 'home' && (
        <div className="fixed bottom-[104px] inset-x-4 max-w-2xl mx-auto z-20 flex flex-col items-center">
            <button
              onClick={handleStartStop}
              className={`w-full max-w-xs mx-auto h-14 rounded-xl flex flex-col items-center justify-center font-bold text-white transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-black shadow-lg ${
                isWorking
                  ? 'bg-red-500 focus:ring-red-300 dark:focus:ring-red-700 shadow-red-500/30'
                  : 'bg-blue-600 focus:ring-blue-300 dark:focus:ring-blue-700 shadow-blue-500/30'
              }`}
            >
               {isWorking ? (
                <>
                  <span className="text-xl font-mono tracking-tighter">{formatDuration(currentSessionDuration)}</span>
                  <span className="text-xs font-semibold mt-0.5">Oprește</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-semibold mt-1">Start Muncă</span>
                </>
              )}
            </button>
        </div>
      )}
      
      <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-10">
          <div className="w-full h-20 bg-white/95 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg">
            <nav className="flex justify-around items-center h-full">
                <NavButton active={page === 'home'} onClick={() => setPage('home')} icon={Home}>Acasă</NavButton>
                <NavButton active={page === 'history'} onClick={() => setPage('history')} icon={History}>Istoric</NavButton>
                {settings.hasNoLimit && <NavButton active={page === 'calculator'} onClick={() => setPage('calculator')} icon={Calculator}>Calculator</NavButton>}
                <NavButton active={page === 'settings'} onClick={() => setPage('settings')} icon={SettingsIcon}>Setări</NavButton>
            </nav>
          </div>
      </div>
    </div>
  );
};

export default App;