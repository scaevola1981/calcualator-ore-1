import React, { useState } from 'react';
import { User, Wallet, CreditCard, Pizza, Percent } from 'lucide-react';

interface OnboardingModalProps {
  onSave: (data: {
    userName: string;
    salary: number;
    mealTicketValue: number;
    standardAdvance: number;
    overtimePercentage: number;
  }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSave }) => {
  const [userName, setUserName] = useState('');
  const [salary, setSalary] = useState<string>('');
  const [mealTicketValue, setMealTicketValue] = useState<string>('30');
  const [standardAdvance, setStandardAdvance] = useState<string>('');
  const [overtimePercentage, setOvertimePercentage] = useState<string>('200');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userName.trim()) {
      setError('Te rugăm să introduci prenumele.');
      return;
    }
    
    const salaryNum = parseFloat(salary);
    if (!salary || isNaN(salaryNum) || salaryNum <= 0) {
      setError('Te rugăm să introduci un salariu valid.');
      return;
    }

    const ticketNum = parseFloat(mealTicketValue);
    if (isNaN(ticketNum) || ticketNum < 0) {
        setError('Valoarea tichetului trebuie să fie un număr valid.');
        return;
    }
    
    const advanceNum = parseFloat(standardAdvance);
    // Standard advance can be 0 or empty (treated as 0)

    const overtimeNum = parseFloat(overtimePercentage);
    if (isNaN(overtimeNum) || overtimeNum < 100) {
        setError('Procentul pentru ore suplimentare trebuie să fie minim 100%.');
        return;
    }

    onSave({
      userName: userName.trim(),
      salary: salaryNum,
      mealTicketValue: ticketNum,
      standardAdvance: isNaN(advanceNum) ? 0 : advanceNum,
      overtimePercentage: overtimeNum,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-primary p-6 text-white text-center">
            <h2 className="text-2xl font-bold mb-1">Configurare Profil</h2>
            <p className="text-blue-100 text-sm">Hai să configurăm aplicația pentru tine!</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Name Input */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Prenume</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Ex: Florin"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white font-medium"
                    />
                </div>
            </div>

            {/* Salary Input */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Salariu Net Lunar (RON)</label>
                <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="number"
                        inputMode="numeric"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="Ex: 4000"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Meal Ticket Input */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase truncate" title="Valoare Tichet Masă">Valoare Tichet</label>
                    <div className="relative">
                        <Pizza className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="number"
                            inputMode="decimal"
                            value={mealTicketValue}
                            onChange={(e) => setMealTicketValue(e.target.value)}
                            placeholder="30"
                            className="w-full pl-10 pr-2 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-medium"
                        />
                    </div>
                </div>

                {/* Advance Input */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase truncate" title="Avans Salariu Standard">Avans Standard</label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="number"
                            inputMode="numeric"
                            value={standardAdvance}
                            onChange={(e) => setStandardAdvance(e.target.value)}
                            placeholder="Ex: 1500"
                            className="w-full pl-10 pr-2 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Overtime Percentage Input */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Procent Spor Ore Suplimentare (%)</label>
                <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="number"
                        inputMode="numeric"
                        value={overtimePercentage}
                        onChange={(e) => setOvertimePercentage(e.target.value)}
                        placeholder="200"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white font-medium"
                    />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Procentul cu care ești plătit pentru orele extra (ex: 200 = dublu).</p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg font-medium text-center">
                    {error}
                </div>
            )}

            <button
                type="submit"
                className="w-full py-4 bg-gradient-primary text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 transition-all text-lg"
            >
                Salvează și Începe 🚀
            </button>
        </form>
      </div>
    </div>
  );
};
