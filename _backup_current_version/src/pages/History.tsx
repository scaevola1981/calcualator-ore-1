
import { useState } from 'react';
import { useWork } from '../context/WorkContext';
import { Trash2, Plus, X } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { calculateSessionEarnings, roundEntryTime, roundExitTime, formatDateLocal } from '../utils/calculation';

export default function History() {
  const { history, deleteSession, addSession, settings, t } = useWork();
  const [showAdd, setShowAdd] = useState(false);
  const [manualDate, setManualDate] = useState(formatDateLocal(new Date()));
  
  // Dropdown states
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");
  const [errorMessage, setErrorMessage] = useState("");

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(settings.language === 'RO' ? 'ro-RO' : 'el-GR', { weekday: 'short', day: '2-digit', month: 'short' });
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (start: number, end?: number) => {
    if (!end) return 'Active';
    const hours = (end - start) / (1000 * 60 * 60);
    return `${hours.toFixed(2)}h`;
  };

  // Preview Logic
  const getPreviewDuration = () => {
    const sH = parseInt(startHour);
    const sM = parseInt(startMinute);
    const eH = parseInt(endHour);
    const eM = parseInt(endMinute);
    
    let minutes = (eH * 60 + eM) - (sH * 60 + sM);
    // Overnight check
    if (minutes < 0) minutes += 24 * 60;
    
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { h, m, isOvernight: (eH * 60 + eM) < (sH * 60 + sM) };
  };

  const preview = getPreviewDuration();

  const handleAdd = () => {
    setErrorMessage("");
    const selectedDate = new Date(manualDate);
    if (isNaN(selectedDate.getTime())) return;

    const sH = parseInt(startHour);
    const sM = parseInt(startMinute);
    const eH = parseInt(endHour);
    const eM = parseInt(endMinute);

    const start = new Date(selectedDate);
    start.setHours(sH, sM, 0, 0);

    let end = new Date(selectedDate);
    end.setHours(eH, eM, 0, 0);

    // Handle overnight
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    let finalStart = start;
    let finalEnd = end;

    finalStart = roundEntryTime(start);
    finalEnd = roundExitTime(end);

    const duration = (finalEnd.getTime() - finalStart.getTime()) / (1000 * 60 * 60);
    
    if (duration <= 0) {
        setErrorMessage("Durata sesiunii trebuie să fie pozitivă.");
        return;
    }

    const earnings = calculateSessionEarnings(duration, settings.hourlyRate, settings.hasNoLimit);

    addSession({
      id: crypto.randomUUID(),
      startTime: finalStart.getTime(),
      endTime: finalEnd.getTime(),
      earnings,
      modeFlag: settings.hasNoLimit
    });
    setShowAdd(false);
  };

  const tileContent = ({ date, view }: any) => {
    if (view === 'month') {
      const hasWork = history.some(s => new Date(s.startTime).toDateString() === date.toDateString());
      return hasWork ? <div className="mx-auto w-1.5 h-1.5 rounded-full bg-magenta-500 mt-1"></div> : null;
    }
    return null;
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-primary">{t('history')}</h1>
        <button 
            className="w-10 h-10 flex items-center justify-center rounded-[20px] text-white shadow-lg active:scale-90 transition-transform" 
            style={{ backgroundColor: '#FF00FF' }}
            onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? <X size={18} /> : <Plus size={20} />}
        </button>
      </div>


      <div className="ios-card">
        <Calendar 
          tileContent={tileContent}
          className="custom-calendar w-full border-none font-sans"
          onChange={(date: any) => {
            setManualDate(formatDateLocal(date));
            setShowAdd(true);
          }}
        />
      </div>

      {showAdd && (
        <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-primary">
                   {t('manualAdd')}
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-400">
                    <X size={18} />
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                 {/* Start Time */}
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1 opacity-70">
                      {t('startTime')}
                    </label>
                    <div className="flex gap-1 items-center p-2 rounded-[20px]" style={{ backgroundColor: 'var(--input-bg)' }}>
                         <select
                            value={startHour}
                            onChange={(e) => setStartHour(e.target.value)}
                            className="w-1/2 bg-transparent text-center font-bold text-base outline-none text-primary"
                          >
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, "0")}>{String(i).padStart(2, "0")}</option>
                            ))}
                         </select>
                         <span className="text-gray-400">:</span>
                         <select
                            value={startMinute}
                            onChange={(e) => setStartMinute(e.target.value)}
                            className="w-1/2 bg-transparent text-center font-bold text-base outline-none text-primary"
                          >
                            {Array.from({ length: 12 }).map((_, i) => (
                              <option key={i} value={String(i * 5).padStart(2, "0")}>{String(i * 5).padStart(2, "0")}</option>
                            ))}
                         </select>
                    </div>
                 </div>

                 {/* End Time */}
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1 opacity-70">
                      {t('endTime')}
                    </label>
                     <div className="flex gap-1 items-center p-2 rounded-[20px]" style={{ backgroundColor: 'var(--input-bg)' }}>
                         <select
                            value={endHour}
                            onChange={(e) => setEndHour(e.target.value)}
                            className="w-1/2 bg-transparent text-center font-bold text-base outline-none text-primary"
                          >
                            {Array.from({ length: 24 }).map((_, i) => (
                              <option key={i} value={String(i).padStart(2, "0")}>{String(i).padStart(2, "0")}</option>
                            ))}
                         </select>
                         <span className="text-gray-400">:</span>
                         <select
                            value={endMinute}
                            onChange={(e) => setEndMinute(e.target.value)}
                            className="w-1/2 bg-transparent text-center font-bold text-base outline-none text-primary"
                          >
                             {Array.from({ length: 12 }).map((_, i) => (
                              <option key={i} value={String(i * 5).padStart(2, "0")}>{String(i * 5).padStart(2, "0")}</option>
                            ))}
                         </select>
                    </div>
                 </div>
             </div>

              {preview && (
               <div className="flex justify-between items-center p-2 rounded-[20px]" style={{ backgroundColor: 'rgba(255,0,255,0.1)' }}>
                 <span className="text-xs font-medium" style={{ color: '#FF00FF' }}>Estimare:</span>
                 <span className="font-bold text-sm" style={{ color: '#FF00FF' }}>
                    {preview.h}h {preview.m > 0 ? `${preview.m}m` : ''}
                    {preview.isOvernight && <span className="ml-1 text-xs">🌙</span>}
                 </span>
               </div>
             )}
             
             {errorMessage && (
                  <div className="text-red-500 text-xs font-medium text-center">
                      {errorMessage}
                  </div>
             )}

             <button className="w-full bg-[#34C759] hover:bg-[#2dbb50] text-white font-bold py-3 rounded-[20px] shadow-lg active:scale-95 transition-all text-base" onClick={handleAdd}>
                 {t('save')}
             </button>
           </div>
        )}
      
      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-400 w-full">
          <p>{t('noData')}</p>
        </div>
      ) : (
        <div className="w-full flex flex-col" style={{ gap: '12px' }}>
          {history.map(session => (
            <div key={session.id} className="ios-card flex justify-between items-center" style={{ padding: '12px 16px' }}>
              <div className="flex flex-col">
                <div className="font-bold text-sm text-primary capitalize">
                  {formatDate(session.startTime)}
                </div>
                <div className="text-xs text-secondary font-medium">
                  {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Running...'}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <div className="text-right">
                       <div className="text-xs font-bold text-primary px-2 py-0.5 rounded-md inline-block" style={{ backgroundColor: 'var(--input-bg)' }}>
                         {formatDuration(session.startTime, session.endTime)}
                       </div>
                       {session.earnings && (
                        <div className="text-xs font-bold text-[#34C759] mt-0.5">
                           +{session.earnings.toFixed(0)} {settings.currency}
                        </div>
                       )}
                  </div>
                  
                  <button 
                    onClick={() => deleteSession(session.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-[#FF3B30] hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
