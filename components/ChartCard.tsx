import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  title: string;
  data: any[];
  hasNoLimit: boolean;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, data, hasNoLimit }) => {
  const tickColor = '#6b7280'; // gray-500
  const gridColor = '#f3f4f6'; // gray-100
  const tooltipBg = '#ffffff'; // white
  const tooltipBorder = '#e5e7eb'; // gray-200
  const textColor = '#111827'; // gray-900

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
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mt-4">
       <div className="mb-2">
         <p className="text-lg font-semibold text-gray-900">{title}</p>
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
              cursor={{fill: 'rgba(161, 161, 170, 0.1)'}}
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '4px 8px'
              }}
              labelStyle={{ color: textColor, fontWeight: 'bold' }}
              itemStyle={{ padding: '2px 0' }}
            />
            <Bar dataKey="Ore Normale" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={10} />
            {!hasNoLimit && <Bar dataKey="Ore Suplimentare" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={10} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};