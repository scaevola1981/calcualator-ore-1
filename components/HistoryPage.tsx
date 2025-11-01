import React, { useMemo, useState } from 'react';
import type { WorkSession } from '../types';
import { BookOpen, Clock, ChevronDown, TrendingUp } from 'lucide-react';
import { TodaySessionsCard } from './TodaySessionsCard';

interface HistoryPageProps {
  workSessions: WorkSession[];
  settings: { normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; };
  todaySessions: WorkSession[];
  formatHoursMinutes: (hours: number) => string;
}

interface DaySummary {
  date: string;
  sessions: WorkSession[];
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  dailyPay: number;
}

const formatDate = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ workSessions, settings, todaySessions, formatHoursMinutes }) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});
    
  const dailySummaries = useMemo<DaySummary[]>(() => {
    const groupedByDay: { [key: string]: WorkSession[] } = {};
    workSessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        const dateKey = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).toISOString();
        if (!groupedByDay[dateKey]) groupedByDay[dateKey] = [];
        groupedByDay[dateKey].push(session);
    });

    return Object.keys(groupedByDay)
        .sort((a, b) => b.localeCompare(a))
        .map(dateKey => {
            const sessions = groupedByDay[dateKey];
            const totalMilliseconds = sessions.reduce((acc, s) => acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()), 0);
            const totalHours = totalMilliseconds / (1000 * 60 * 60);

            let normalHours = 0;
            let overtimeHours = 0;
            if (settings.hasNoLimit) {
                normalHours = totalHours;
            } else {
                normalHours = Math.min(totalHours, settings.normalHoursLimit);
                overtimeHours = Math.max(0, totalHours - settings.normalHoursLimit);
            }
            const dailyPay = totalHours * settings.hourlyRate;
            
            return {
                date: dateKey,
                sessions: sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
                totalHours, normalHours, overtimeHours, dailyPay
            };
    });
  }, [workSessions, settings]);

  const grandTotals = useMemo(() => {
    const totals = dailySummaries.reduce((acc, summary) => {
      acc.total += summary.totalHours;
      acc.normal += summary.normalHours;
      acc.overtime += summary.overtimeHours;
      return acc;
    }, { total: 0, normal: 0, overtime: 0 });
    const totalPay = totals.total * settings.hourlyRate;
    return { ...totals, totalPay };
  }, [dailySummaries, settings.hourlyRate]);

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  if (dailySummaries.length === 0 && todaySessions.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-2xl font-bold text-black dark:text-white">Niciun istoric</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Începe o sesiune de lucru pentru a vedea istoricul aici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
        <div
          className="p-4 cursor-pointer flex justify-between items-center"
          onClick={() => setIsSummaryExpanded(prev => !prev)}
        >
          <h2 className="text-lg font-semibold text-black dark:text-white">Sumar General</h2>
          <div className="flex items-center gap-3">
              <p className="text-lg font-semibold text-blue-500">{formatHoursMinutes(grandTotals.total)}</p>
              <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isSummaryExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 pb-4">
              <div className={`grid ${settings.hasNoLimit ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'} gap-3 text-center pt-3 border-t border-zinc-200 dark:border-zinc-800`}>
                  <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{settings.hasNoLimit ? 'Total Ore Lucrate' : 'Normale'}</p>
                      <p className="text-2xl font-semibold text-blue-500">{formatHoursMinutes(grandTotals.normal)}</p>
                  </div>
                  {!settings.hasNoLimit && (
                    <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Suplimentare</p>
                        <p className="text-2xl font-semibold text-orange-500">{formatHoursMinutes(grandTotals.overtime)}</p>
                    </div>
                  )}
              </div>
              {settings.hasNoLimit && (
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Venit Total Estimat</p>
                    <p className="text-2xl font-semibold text-green-500">
                      {grandTotals.totalPay.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="ml-1 text-lg">{settings.currency}</span>
                    </p>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {dailySummaries.map((summary, idx) => (
            <div key={summary.date} className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
               <div
                  className="p-4 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleDayExpansion(summary.date)}
               >
                  <h3 className="font-semibold text-black dark:text-white">{formatDate(new Date(summary.date))}</h3>
                  <div className="flex items-center gap-3">
                      <p className="font-semibold text-zinc-600 dark:text-zinc-300">{formatHoursMinutes(summary.totalHours)}</p>
                      <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${expandedDays[summary.date] ? 'rotate-180' : ''}`} />
                  </div>
               </div>
              <div className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${expandedDays[summary.date] ? 'max-h-[1000px]' : 'max-h-0'}`}>
                <div className="px-4 pb-4">
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                      <div className={`grid ${settings.hasNoLimit ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'} gap-3 text-center mb-4`}>
                        <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{settings.hasNoLimit ? 'Total Ore Lucrate' : 'Normale'}</p>
                            <p className="text-lg font-semibold text-blue-500">{formatHoursMinutes(summary.normalHours)}</p>
                        </div>
                        {!settings.hasNoLimit && (
                          <div>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">Suplimentare</p>
                              <p className="text-lg font-semibold text-orange-500">{formatHoursMinutes(summary.overtimeHours)}</p>
                          </div>
                        )}
                      </div>
                       {settings.hasNoLimit && (
                        <div className="mt-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Venit Estimat (Zi)</p>
                            <p className="text-lg font-semibold text-green-500">
                                {summary.dailyPay.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="ml-1">{settings.currency}</span>
                            </p>
                        </div>
                      )}
                    </div>
                     {summary.sessions.length > 0 && (
                        <div className="mt-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <h4 className="font-semibold text-black dark:text-white mb-2">Sesiuni</h4>
                            <ul className="space-y-1">
                                {summary.sessions.map((session, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                        <Clock className="w-4 h-4 text-zinc-400"/>
                                        Sesiunea {index + 1}
                                      </div>
                                      <div className="font-mono text-zinc-800 dark:text-zinc-200 text-xs">
                                          <span>{formatTime(new Date(session.startTime))}</span>
                                          <span className="mx-1">-</span>
                                          <span>{formatTime(new Date(session.endTime))}</span>
                                      </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                     )}
                </div>
              </div>
            </div>
        ))}
      </div>
      <TodaySessionsCard sessions={todaySessions} />
    </div>
  );
};