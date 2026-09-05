import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { startOfWeek, endOfWeek, isWithinInterval, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const FUNNY_MESSAGES = [
  "Time is money, friend!",
  "Keep grinding!",
  "Another day, another dollar.",
  "Make it happen.",
  "Focus mode: ON."
];

export default function Dashboard() {
  const { currentSession, startSession, stopSession, history, settings, t } = useWork();
  const [elapsed, setElapsed] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const navigate = useNavigate();

  // Monthly Stats state
  const [monthHours, setMonthHours] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);

  useEffect(() => {
    let interval: any;
    if (currentSession) {
      const updateTimer = () => {
        const diff = Math.floor((Date.now() - currentSession.startTime) / 1000);
        setElapsed(diff);
      };
      
      updateTimer(); // Initial update
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  useEffect(() => {
    // 1. Weekly Data
    const startWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
    const endWeek = endOfWeek(new Date(), { weekStartsOn: 1 });

    const days = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];
    const data = days.map(day => ({ name: day, hours: 0 }));

    // 2. Monthly Data
    const startMonthDate = startOfMonth(new Date());
    const endMonthDate = endOfMonth(new Date());
    let mHours = 0;
    let mEarnings = 0;

    history.forEach(session => {
      const sessionDate = new Date(session.startTime);
      
      // Weekly Logic
      if (isWithinInterval(sessionDate, { start: startWeek, end: endWeek })) {
        const dayIndex = (getDay(sessionDate) + 6) % 7; // Adjust to 0=Mon
        let duration = 0;
        if (session.endTime) {
            duration = (session.endTime - session.startTime) / (1000 * 60 * 60);
        }
        data[dayIndex].hours += duration;
      }

      // Monthly Logic
      if (isWithinInterval(sessionDate, { start: startMonthDate, end: endMonthDate })) {
        if (session.endTime) {
           const dur = (session.endTime - session.startTime) / (1000 * 60 * 60);
           mHours += dur;
           if (session.earnings) {
             mEarnings += session.earnings;
           }
        }
      }
    });

    setWeeklyData(data);
    setMonthHours(mHours);
    setMonthEarnings(mEarnings);
  }, [history]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="page-container" style={{ paddingBottom: '220px', height: '100%' }}>
      
      {/* 1. FUNNY MESSAGE */}
      <div className="text-center">
        <p className="italic font-medium text-sm" style={{ color: '#FF00FF' }}>
          "{FUNNY_MESSAGES[0]}"
        </p>
      </div>
      
      {/* 2. CHART - Takes available space */}
      <div className="ios-card flex-1 flex flex-col" style={{ minHeight: '250px' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base text-primary">{t('weeklyChart')}</h3>
             <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-secondary">
               Total: {weeklyData.reduce((acc: any, curr: any) => acc + curr.hours, 0).toFixed(1)}h
             </span>
          </div>
          <div className="flex-1 w-full" style={{ minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: 'var(--text-secondary)', fontSize: 12}}
                  dy={8}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'transparent',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}h`, '']}
                  labelStyle={{ display: 'none' }}
                />
                <Bar dataKey="hours" radius={[8, 8, 8, 8]} barSize={28}>
                  {weeklyData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill="#FF00FF" />
                  ))}
              </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
       </div>

      {/* 3. SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-4">
        <div onClick={() => navigate('/history')} className="ios-card active:scale-95 transition-transform cursor-pointer flex flex-col items-center justify-center text-center py-8">
            <span className="text-sm font-semibold text-secondary uppercase mb-2">{t('totalHours')}</span>
            <span className="text-4xl font-bold text-primary">{monthHours.toFixed(1)}</span>
        </div>
        <div onClick={() => navigate('/history')} className="ios-card active:scale-95 transition-transform cursor-pointer flex flex-col items-center justify-center text-center py-8">
             <span className="text-sm font-semibold text-secondary uppercase mb-2">{t('totalIncome')}</span>
            <span className="text-4xl font-bold text-primary">{monthEarnings.toFixed(0)} <span className="text-lg font-normal text-muted">{settings.currency}</span></span>
        </div>
      </div>

      {/* 4. TIMER & BUTTON - STICKY CARD at bottom */}
      <div 
        className="fixed left-0 right-0 px-4 z-50"
        style={{ bottom: '75px' }}
      >
        <div className="ios-card flex flex-col items-center text-center" style={{ gap: '12px' }}>
          {/* Timer */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary opacity-70">
              {t('currentSession')}
            </span>
            <div className="font-mono text-5xl font-light tracking-tight text-primary tabular-nums">
              {formatTime(elapsed)}
            </div>
            {currentSession && (
              <span className="text-xs text-secondary">
                Started {new Date(currentSession.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
          </div>

          {/* Start/Stop Button */}
          {!currentSession ? (
            <button 
              onClick={startSession}
              className="w-full bg-[#34C759] hover:bg-[#2dbb50] text-white font-bold py-6 rounded-[20px] text-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Play size={22} fill="currentColor" /> {t('start')}
            </button>
          ) : (
             <button 
              onClick={stopSession}
              className="w-full bg-[#FF3B30] hover:bg-[#e6352b] text-white font-bold py-6 rounded-[20px] text-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Square size={22} fill="currentColor" /> {t('stop')}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
