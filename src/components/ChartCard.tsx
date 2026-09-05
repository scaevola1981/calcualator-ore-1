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
  // Light Mode: Black Ticks, White Grid, White Bars (on Blue Gradient)
  // Dark Mode: White Ticks, Transparent Grid, White Bars (on Glass)
  const tickColor = isDark ? 'rgba(255, 255, 255, 0.8)' : '#000000'; // Black for light
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)';
  const barColorOvertime = '#E91E63'; // Magenta/Roz

  // Calculate ticks for the Y-axis (0 to 10h basic, or dynamic if larger)
  const yAxisTicks = useMemo(() => {
    let maxVal = 0;
    if (data && data.length > 0) {
      maxVal = data.reduce((max, entry) => {
        const total = (entry['Ore Normale'] || 0) + (entry['Ore Suplimentare'] || 0);
        return Math.max(max, total);
      }, 0);
    }
    const upperBound = Math.max(10, Math.ceil(maxVal)); // Default to 10h as per request
    return [0, 2.5, 5, 7.5, upperBound];
  }, [data]);

  return (
    <div className={`w-full p-6 animate-fade-in relative z-10 rounded-[25px] shadow-xl transition-all duration-300 ${isDark
      ? 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-black/50'
      : 'card-v6 shadow-blue-500/20' // Use card-v6 for the Blue Gradient
      }`}>
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-lg tracking-wider uppercase text-center text-white text-shadow-sm">
          {title}
        </h3>

        <button
          onClick={onNextWeek}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full" style={{ height: 250, minHeight: 250 }}>
        {isMounted ? (

          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={100}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              barCategoryGap={12}
            >
              <CartesianGrid
                stroke={gridColor}
                vertical={false}
                strokeDasharray="2 2" // Fine dotted lines
              />
              <XAxis
                dataKey="name"
                tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                ticks={yAxisTicks}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                contentStyle={{
                  backgroundColor: '#000000', // Always Black for contrast
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  color: '#FFFFFF'
                }}
                labelStyle={{ color: '#aaa', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}
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
                fill="#FFFFFF" // Always White bars on Blue/Dark background
                radius={[0, 0, 0, 0]}
              />
              {!hasNoLimit && (
                <Bar
                  dataKey="Ore Suplimentare"
                  stackId="a"
                  fill={barColorOvertime}
                  radius={[4, 4, 0, 0]} // Rounded top
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
};