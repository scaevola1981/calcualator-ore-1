import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Moon, Sun } from 'lucide-react';
import { calculateNightHours } from '../utils/timeRounding';
import type { WorkSession } from '../types';

interface DayNightChartProps {
  workSessions: WorkSession[];
  currentMonth: Date;
}

export const DayNightChart: React.FC<DayNightChartProps> = ({ workSessions, currentMonth }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(() => {
    let totalNight = 0;
    let totalAll = 0;

    const targetMonth = currentMonth.getMonth();
    const targetYear = currentMonth.getFullYear();

    workSessions.forEach(session => {
      // Ensure valid dates
      if (!session.startTime || !session.endTime) return;

      const sStart = new Date(session.startTime);
      const sEnd = new Date(session.endTime);

      if (sStart.getMonth() === targetMonth && sStart.getFullYear() === targetYear) {
        const duration = (sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60);
        const night = calculateNightHours(sStart, sEnd);
        totalAll += duration;
        totalNight += night;
      }
    });

    const totalDay = Math.max(0, totalAll - totalNight);

    return [
      { name: 'Zi (06:00 - 22:00)', value: parseFloat(totalDay.toFixed(2)), color: '#ea580c' }, // Orange Primary
      { name: 'Noapte (22:00 - 06:00)', value: parseFloat(totalNight.toFixed(2)), color: '#1e293b' }, // Slate Dark
    ];
  }, [workSessions, currentMonth]);

  const hasData = data.some(d => d.value > 0);

  if (!hasData) return null;

  return (
    <div className="card-modern p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Raport Lunar: Zi vs Noapte</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
        {/* Chart */}
        <div className="w-48 h-48 relative">
          <ResponsiveContainer width="100%" height={192} minWidth={0} minHeight={192}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}h`, '']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm font-bold text-gray-400">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4 min-w-[200px]">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {index === 0 ? "Interval Zi" : "Interval Noapte"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {index === 0 ? "06:00 - 22:00" : "22:00 - 06:00"}
                  </span>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {item.value}h
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
