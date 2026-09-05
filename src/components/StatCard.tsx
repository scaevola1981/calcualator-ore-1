import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: 'blue' | 'purple' | 'green' | 'orange';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue' }) => {
  const getContainerClass = () => {
    switch (color) {
      case 'purple': return 'icon-container-accent';
      case 'green': return 'icon-container-success';
      case 'orange': return 'icon-container-warning';
      default: return 'icon-container-primary';
    }
  };



  return (
    <div className="blue-gradient-card animate-fade-in group cursor-default">
      <div className="flex items-center space-x-4 p-5">
        <div className={`${getContainerClass()} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="ios-label text-white/80 mb-1">{title}</p>
          <p className="stat-value font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};