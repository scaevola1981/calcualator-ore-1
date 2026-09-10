import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ChartCard.css';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  hasNoLimit: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  isDark?: boolean;
  weekTotals?: {
    normal: number;
    overtime: number;
    total: number;
  };
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  data,
  hasNoLimit,
  onPrevWeek,
  onNextWeek,
  isPrevDisabled = false,
  isNextDisabled = false,
  isDark = false,
  weekTotals,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Delay rendering to ensure layout is computed
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Styling Constants based on Theme
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const barColorNormal = '#0284C7'; // Sky Blue
  const barColorOvertime = '#8B5CF6'; // Vibrant Purple

  // Calculate ticks for the Y-axis (0 to 10h basic, or dynamic if larger)
  const yAxisTicks = useMemo(() => {
    let maxVal = 0;
    if (data && data.length > 0) {
      maxVal = data.reduce((max, entry) => {
        const total = (entry['Ore Normale'] || 0) + (entry['Ore Suplimentare'] || 0);
        return Math.max(max, total);
      }, 0);
    }
    const upperBound = Math.max(10, Math.ceil(maxVal));
    const step = upperBound <= 10 ? 2.5 : Math.ceil(upperBound / 4);
    const ticks = [];
    for (let t = 0; t <= upperBound; t += step) {
      ticks.push(t);
    }
    if (!ticks.includes(upperBound)) {
      ticks.push(upperBound);
    }
    return ticks;
  }, [data]);

  const formatHoursMinutes = (hoursDecimal: number) => {
    if (isNaN(hoursDecimal) || hoursDecimal <= 0) return "0h 00m";
    const totalMinutes = Math.round(hoursDecimal * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

  return (
    <div className={`w-full min-w-0 p-4 sm:p-6 animate-fade-in relative z-10 rounded-[26px] transition-all duration-300 ${isDark
      ? 'bg-[#132337] border border-white/10 shadow-lg shadow-black/40'
      : 'bg-white border border-gray-100 shadow-lg shadow-gray-200/50'
      }`}>
      {/* Header with Navigation */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={onPrevWeek}
          disabled={isPrevDisabled}
          className={`p-2 rounded-xl transition-all ${
            isPrevDisabled
              ? 'opacity-30 cursor-not-allowed text-gray-400'
              : 'hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 text-gray-700 dark:text-gray-200'
          }`}
          aria-label="Săptămâna anterioară"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center min-w-0 flex-1 text-center">
          <h3 className="font-black text-xs sm:text-sm tracking-wider uppercase text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {subtitle && (
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {subtitle}
            </span>
          )}
        </div>

        <button
          onClick={onNextWeek}
          disabled={isNextDisabled}
          className={`p-2 rounded-xl transition-all ${
            isNextDisabled
              ? 'opacity-30 cursor-not-allowed text-gray-400'
              : 'hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 text-gray-700 dark:text-gray-200'
          }`}
          aria-label="Săptămâna următoare"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend & Weekly Total */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pt-1 border-t border-gray-100 dark:border-white/5 text-xs font-semibold">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
            <span className="text-[11px]">Normale</span>
          </div>
          {!hasNoLimit && (
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
              <span className="text-[11px]">Suplimentare</span>
            </div>
          )}
        </div>

        {weekTotals && (
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 font-mono">
            Total: <span className="text-gray-900 dark:text-white font-black">{formatHoursMinutes(weekTotals.total)}</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="w-full min-w-0 overflow-hidden h-[225px]">
        {isMounted ? (
          <ResponsiveContainer width="100%" height={225} minWidth={0}>
            <BarChart
              data={data}
              margin={{ top: 12, right: 8, left: -10, bottom: 5 }}
              barCategoryGap="12%"
            >
              <CartesianGrid
                stroke={gridColor}
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: tickColor, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                width={30}
                tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                ticks={yAxisTicks}
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                contentStyle={{
                  backgroundColor: isDark ? '#0D1B2A' : '#1F2937',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  color: '#FFFFFF'
                }}
                labelStyle={{ color: '#94A3B8', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}
                formatter={(value: any, name: any) => {
                  if (typeof value !== 'number') return [value, name];
                  const hrs = Math.floor(value);
                  const mins = Math.round((value - hrs) * 60);
                  const label = `${hrs}h ${mins > 0 ? `${mins}m` : '00m'}`;
                  return [label, name];
                }}
              />
              {/* Stacked Bars: Normal (Bottom) + Overtime (Top) */}
              <Bar
                dataKey="Ore Normale"
                stackId="a"
                fill={barColorNormal}
                maxBarSize={22}
                radius={[0, 0, 0, 0]}
              />
              {!hasNoLimit && (
                <Bar
                  dataKey="Ore Suplimentare"
                  stackId="a"
                  fill={barColorOvertime}
                  maxBarSize={22}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};