import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ChartCard.css';

interface ChartCardProps {
  title: string;
  data: any[];
  hasNoLimit: boolean;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  isDark?: boolean; // New prop
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  hasNoLimit,
  onPrevWeek,
  onNextWeek,
  isDark = false
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
    return [0, 2.5, 5, 7.5, upperBound];
  }, [data]);

  return (
    <div className={`w-full p-5 sm:p-6 animate-fade-in relative z-10 rounded-[26px] transition-all duration-300 ${isDark
      ? 'bg-[#132337] border border-white/10 shadow-lg shadow-black/40'
      : 'bg-white border border-gray-100 shadow-lg shadow-gray-200/50'
      }`}>
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-300"
          aria-label="Săptămâna anterioară"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-sm sm:text-base tracking-wider uppercase text-center text-gray-900 dark:text-white">
          {title}
        </h3>

        <button
          onClick={onNextWeek}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-300"
          aria-label="Săptămâna următoare"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mb-3 text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <span className="w-3 h-3 rounded-full bg-[#0284C7]"></span>
          <span>Normale</span>
        </div>
        {!hasNoLimit && (
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="w-3 h-3 rounded-full bg-[#8B5CF6]"></span>
            <span>Suplimentare</span>
          </div>
        )}
      </div>

      <div className="w-full h-[220px]">
        {isMounted ? (
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              barCategoryGap={14}
            >
              <CartesianGrid
                stroke={gridColor}
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
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
                  borderRadius: '12px',
                  padding: '8px 12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  color: '#FFFFFF'
                }}
                labelStyle={{ color: '#94A3B8', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}
                itemStyle={{ padding: 0, fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}
                formatter={(value: any, name: any) => {
                  if (typeof value !== 'number') return [value, name];
                  const hrs = Math.floor(value);
                  const mins = Math.round((value - hrs) * 60);
                  return [`${hrs}h ${mins > 0 ? `${mins}m` : ''}`, name];
                }}
              />
              {/* Stacked Bars: Normal (Bottom) + Overtime (Top) */}
              <Bar
                dataKey="Ore Normale"
                stackId="a"
                fill={barColorNormal}
                radius={[4, 4, 0, 0]}
              />
              {!hasNoLimit && (
                <Bar
                  dataKey="Ore Suplimentare"
                  stackId="a"
                  fill={barColorOvertime}
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