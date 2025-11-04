import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};