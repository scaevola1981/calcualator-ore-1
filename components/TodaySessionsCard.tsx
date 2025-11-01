import React from 'react';
import type { WorkSession } from '../types';
import { Clock, ListChecks } from 'lucide-react';

interface TodaySessionsCardProps {
  sessions: WorkSession[];
}

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};

export const TodaySessionsCard: React.FC<TodaySessionsCardProps> = ({ sessions }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm">
       <div className="mb-2">
         <p className="text-lg font-semibold text-black dark:text-white">Sesiuni Azi</p>
       </div>
       {sessions.length > 0 ? (
          <ul className="space-y-1 max-h-32 overflow-y-auto pr-2">
              {sessions.map((session, index) => (
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
       ) : (
          <div className="text-center py-4">
            <ListChecks className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-500 mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nicio sesiune finalizată azi.</p>
          </div>
       )}
    </div>
  );
};