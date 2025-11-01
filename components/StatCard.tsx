import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};