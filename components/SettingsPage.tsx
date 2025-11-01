import React, { useState } from 'react';
import { SlidersHorizontal, Moon, Sun, LogOut, KeyRound, Save } from 'lucide-react';

interface SettingsPageProps {
  settings: { normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; };
  onSettingsChange: (newSettings: { normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; }) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

const SettingsGroup: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm">{children}</div>
);

const SettingsRow: React.FC<{children: React.ReactNode, isFirst?: boolean, isLast?: boolean}> = ({ children }) => (
    <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
        {children}
    </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange, theme, onThemeChange, onLogout }) => {

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.valueAsNumber;
    if (!isNaN(value) && value > 0 && value <= 24) {
      onSettingsChange({ ...settings, normalHoursLimit: value });
    }
  };

  const handleNoLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, hasNoLimit: e.target.checked });
  };
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    const storedCredentialsRaw = localStorage.getItem('userCredentials');
    if (!storedCredentialsRaw) {
      setPasswordChangeError('Eroare: Nu s-au găsit datele de cont.');
      return;
    }

    const storedCredentials = JSON.parse(storedCredentialsRaw);

    if (currentPassword !== storedCredentials.password) {
      setPasswordChangeError('Parola curentă este incorectă.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('Parolele noi nu se potrivesc.');
      return;
    }
    
    if (newPassword.length < 6) {
        setPasswordChangeError('Parola nouă trebuie să conțină cel puțin 6 caractere.');
        return;
    }

    const newCredentials = { ...storedCredentials, password: newPassword };
    localStorage.setItem('userCredentials', JSON.stringify(newCredentials));
    setPasswordChangeSuccess('Parola a fost schimbată cu succes!');
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    
    setTimeout(() => setPasswordChangeSuccess(''), 3000);
  };
  
  const appVersion = "4.1.0";

  return (
    <div className="space-y-6">
      <SettingsGroup>
        <SettingsRow>
           <span className="text-black dark:text-white">Temă</span>
           <div className="bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg flex items-center text-sm">
             <button onClick={() => onThemeChange('light')} className={`px-3 py-1 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-zinc-700 shadow' : 'text-zinc-500'}`}>
                Light
             </button>
             <button onClick={() => onThemeChange('dark')} className={`px-3 py-1 rounded-md transition-all ${theme === 'dark' ? 'bg-black shadow' : 'text-zinc-400'}`}>
                Dark
             </button>
           </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow>
            <label htmlFor="normalHoursLimit" className="text-black dark:text-white">
              Limită Ore Normale
            </label>
            <input
              type="number"
              id="normalHoursLimit"
              value={settings.normalHoursLimit}
              onChange={handleLimitChange}
              min="1"
              max="24"
              disabled={settings.hasNoLimit}
              className="w-20 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white text-right rounded-lg px-2 py-1 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition-opacity disabled:opacity-50"
            />
        </SettingsRow>
        <SettingsRow>
            <label htmlFor="noLimit" className="text-black dark:text-white select-none">
                Fără limită
            </label>
            <input
                type="checkbox"
                id="noLimit"
                checked={settings.hasNoLimit}
                onChange={handleNoLimitChange}
                className="h-5 w-5 rounded-md accent-blue-500"
            />
        </SettingsRow>
      </SettingsGroup>
      
      <SettingsGroup>
        <div className="p-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Schimbare Parolă</h3>
            <form onSubmit={handlePasswordChange} className="space-y-2">
               <input type="password" placeholder="Parola curentă" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
               <input type="password" placeholder="Parola nouă" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
               <input type="password" placeholder="Confirmare parolă nouă" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
               {passwordChangeError && <p className="text-red-500 text-sm">{passwordChangeError}</p>}
               {passwordChangeSuccess && <p className="text-green-500 text-sm">{passwordChangeSuccess}</p>}
               <button type="submit" className="w-full py-2 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors duration-200">
                 Salvează Parola
               </button>
            </form>
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <button
          onClick={onLogout}
          className="w-full text-center p-4 font-semibold text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors duration-200"
        >
          Deconectare
        </button>
      </SettingsGroup>

      <div className="text-center text-zinc-400 dark:text-zinc-600 text-xs space-y-1">
            <p>Versiune {appVersion}</p>
      </div>
    </div>
  );
};