import React from 'react';
import { TrendingUp, Scale, Coins } from 'lucide-react';

interface CalculatorPageProps {
  totalHours: number;
  settings: { hourlyRate: number; currency: 'RON' | 'EUR'; hasNoLimit: boolean; normalHoursLimit: number; };
  onSettingsChange: (newSettings: { hourlyRate: number; currency: 'RON' | 'EUR'; hasNoLimit: boolean; normalHoursLimit: number; }) => void;
}

const SettingsGroup: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">{children}</div>
);

const SettingsRow: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
        {children}
    </div>
);

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ totalHours, settings, onSettingsChange }) => {
  const { hourlyRate, currency } = settings;
  const totalPay = totalHours * hourlyRate;

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const newRate = value === '' ? 0 : parseFloat(value);
    if (!isNaN(newRate) && newRate >= 0) {
      onSettingsChange({ ...settings, hourlyRate: newRate });
    }
  };

  const handleCurrencyChange = (newCurrency: 'RON' | 'EUR') => {
    onSettingsChange({ ...settings, currency: newCurrency });
  };
  
  const currencySymbols = {
    'RON': 'RON',
    'EUR': '€'
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 dark:bg-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6" />
            <p className="font-semibold">Venit Total Estimat</p>
          </div>
          <p className="text-4xl font-bold tracking-tight">
            {totalPay.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-2xl ml-2 font-medium opacity-80">{currencySymbols[currency]}</span>
          </p>
          <p className="text-sm opacity-80 mt-2">
            {totalHours.toFixed(2)} ore × {hourlyRate.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} {currencySymbols[currency]}/oră
          </p>
      </div>

      <div className="space-y-3">
        <SettingsGroup>
          <SettingsRow>
            <label htmlFor="hourlyRate" className="text-gray-900 dark:text-white flex items-center gap-3">
              <Scale className="w-5 h-5 text-gray-500" />
              <span>Valoare Oră</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="hourlyRate"
                value={hourlyRate === 0 ? '' : hourlyRate}
                onChange={handleRateChange}
                placeholder="0"
                min="0"
                step="any"
                className="w-24 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-right rounded-lg px-2 py-1 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-gray-500 dark:text-zinc-400 font-medium">{currencySymbols[currency]}</span>
            </div>
          </SettingsRow>
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow>
            <span className="text-gray-900 dark:text-white flex items-center gap-3">
              <Coins className="w-5 h-5 text-gray-500" />
              <span>Monedă</span>
            </span>
            <div className="bg-gray-200 dark:bg-zinc-800 p-1 rounded-lg flex items-center text-sm font-semibold">
              <button onClick={() => handleCurrencyChange('RON')} className={`px-4 py-1 rounded-md transition-all ${currency === 'RON' ? 'bg-white shadow' : 'text-gray-500'}`}>
                  RON
              </button>
              <button onClick={() => handleCurrencyChange('EUR')} className={`px-4 py-1 rounded-md transition-all ${currency === 'EUR' ? 'bg-white shadow' : 'text-gray-500'}`}>
                  EUR
              </button>
            </div>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </div>
  );
};