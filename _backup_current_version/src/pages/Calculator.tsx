import { useState } from 'react';
import { useWork } from '../context/WorkContext';

export default function Calculator() {
  const { t, history, settings } = useWork();
  const [rate, setRate] = useState(settings.hourlyRate);
  const [currency, setCurrency] = useState(settings.currency || 'EUR');

  // Simple calculation based on total history hours
  const totalHours = history.reduce((acc, curr) => {
    if (!curr.endTime) return acc;
    return acc + (curr.endTime - curr.startTime) / (1000 * 60 * 60);
  }, 0);

  const daysWorked = new Set(history.map(s => new Date(s.startTime).toDateString())).size;
  const projectedIncome = totalHours * rate;

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold tracking-tight text-primary w-full">{t('calculator')}</h1>

      <div className="ios-card flex flex-col" style={{ gap: '16px' }}>
        
        {/* iOS Segmented Control for Currency - Magenta Active */}
        <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-[20px] flex">
           {['EUR', 'RON'].map((curr) => (
             <button
               key={curr}
               onClick={() => setCurrency(curr)}
               className={`flex-1 py-2 text-sm font-bold rounded-[20px] transition-all ${
                 currency === curr 
                 ? 'text-white shadow' 
                 : 'text-secondary hover:text-primary'
               }`}
               style={currency === curr ? { backgroundColor: '#FF00FF' } : {}}
             >
               {curr}
             </button>
           ))}
        </div>

        {/* Hourly Rate Input */}
        <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2 opacity-70">
                {t('hourlyRate')}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={rate} 
                  onChange={e => setRate(Number(e.target.value))}
                  className="w-full p-4 rounded-[20px] bg-gray-100 dark:bg-zinc-800 text-primary font-bold text-2xl outline-none focus:ring-2 focus:ring-[#FF00FF] transition-all text-center"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                  / h
                </span>
              </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-[20px] text-center">
             <div className="text-xs uppercase font-bold text-secondary mb-1 opacity-70">{t('totalHours')}</div>
             <div className="text-lg font-bold text-primary">{totalHours.toFixed(1)}</div>
          </div>
           <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-[20px] text-center">
             <div className="text-xs uppercase font-bold text-secondary mb-1 opacity-70">{t('daysWorked')}</div>
             <div className="text-lg font-bold text-primary">{daysWorked}</div>
          </div>
        </div>
      </div>
      
      {/* Result Card - PROMINENT Magenta */}
      <div className="ios-card text-center relative overflow-hidden" style={{ borderWidth: '2px', borderColor: '#FF00FF', boxShadow: '0 0 20px rgba(255,0,255,0.2)' }}>
         <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(to right, #FF00FF, #AA00FF)' }}></div>
         <div className="text-sm font-semibold text-secondary mb-2">{t('totalIncome')}</div>
         <div className="text-4xl font-extrabold" style={{ color: '#FF00FF' }}>
           {projectedIncome.toFixed(0)} <span className="text-xl font-bold text-secondary">{currency}</span>
         </div>
      </div>
    </div>
  );
}
