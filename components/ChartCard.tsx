import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  title: string;
  data: any[];
  theme: 'light' | 'dark';
  hasNoLimit: boolean;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, data, theme, hasNoLimit }) => {
  const isDark = theme === 'dark';

  const tickColor = isDark ? '#71717a' : '#71717a'; // zinc-500
  const gridColor = isDark ? '#27272a' : '#f4f4f5'; // zinc-800, zinc-100
  const tooltipBg = isDark ? '#18181b' : '#ffffff'; // zinc-900, white
  const tooltipBorder = isDark ? '#3f3f46' : '#e4e4e7'; // zinc-700, zinc-200
  const textColor = isDark ? '#f4f4f5' : '#18181b'; // zinc-100, zinc-900

  // Calculate ticks for the Y-axis with 0.5 increments
  const yAxisTicks = useMemo(() => {
    let maxVal = 0;
    if (data && data.length > 0) {
        maxVal = data.reduce((max, entry) => {
            const total = (entry['Ore Normale'] || 0) + (entry['Ore Suplimentare'] || 0);
            return Math.max(max, total);
        }, 0);
    }
    const upperBound = Math.max(4, Math.ceil(maxVal * 2) / 2);
    const ticks = [];
    for (let i = 0; i <= upperBound; i += 0.5) {
        ticks.push(i);
    }
    return ticks;
  }, [data]);

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm mt-4">
       <div className="mb-2">
         <p className="text-lg font-semibold text-black dark:text-white">{title}</p>
       </div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis 
                tick={{ fill: tickColor, fontSize: 12 }} 
                ticks={yAxisTicks}
                tickFormatter={(tick) => tick.toFixed(1)}
                axisLine={false}
                tickLine={false}
                width={30}
            />
            <Tooltip
              cursor={{fill: 'rgba(161, 161, 170, 0.1)'}} // zinc-400/10
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '4px 8px'
              }}
              labelStyle={{ color: textColor, fontWeight: 'bold' }}
              itemStyle={{ color: textColor, padding: '2px 0' }}
            />
            <Bar dataKey="Ore Normale" stackId="a" fill="#007AFF" radius={[4, 4, 0, 0]} barSize={10} />
            {!hasNoLimit && <Bar dataKey="Ore Suplimentare" stackId="a" fill="#FF9500" radius={[4, 4, 0, 0]} barSize={10} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};