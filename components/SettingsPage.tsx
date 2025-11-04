import React, { useState } from 'react';

interface SettingsPageProps {
  settings: { normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; };
  onSettingsChange: (newSettings: { normalHoursLimit: number; hasNoLimit: boolean; hourlyRate: number; currency: 'RON' | 'EUR'; }) => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange, onLogout }) => {

  const handleLimitChange = (increment: number) => {
    const currentValue = settings.normalHoursLimit;
    const newValue = currentValue + increment;
    if (newValue >= 1 && newValue <= 24) {
      onSettingsChange({ ...settings, normalHoursLimit: newValue });
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
  
  const appVersion = "5.0.0";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200">
        {/* Normal Hours Limit Row */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <label htmlFor="normalHoursLimit" className="text-gray-900">
            Limită Ore Normale
          </label>
          <div className="flex items-center bg-gray-100 rounded-md">
            <input
              type="text"
              id="normalHoursLimit"
              value={settings.normalHoursLimit}
              readOnly
              disabled={settings.hasNoLimit}
              className="w-8 bg-transparent text-gray-900 text-center font-medium focus:outline-none disabled:opacity-50"
            />
            <div className="flex flex-col">
                <button onClick={() => handleLimitChange(1)} disabled={settings.hasNoLimit || settings.normalHoursLimit >= 24} className="px-1 text-gray-500 disabled:opacity-30">▲</button>
                <button onClick={() => handleLimitChange(-1)} disabled={settings.hasNoLimit || settings.normalHoursLimit <= 1} className="px-1 text-gray-500 disabled:opacity-30">▼</button>
            </div>
          </div>
        </div>

        {/* No Limit Row */}
        <div className="flex items-center justify-between p-4">
          <label htmlFor="noLimit" className="text-gray-900 select-none">
            Fără limită
          </label>
          <input
            type="checkbox"
            id="noLimit"
            checked={settings.hasNoLimit}
            onChange={handleNoLimitChange}
            className="h-6 w-6 rounded-md accent-blue-500"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schimbare Parolă</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
           <input type="password" placeholder="Parola curentă" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-gray-100 text-gray-900 placeholder:text-gray-500 rounded-lg p-3 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
           <input type="password" placeholder="Parola nouă" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-gray-100 text-gray-900 placeholder:text-gray-500 rounded-lg p-3 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
           <input type="password" placeholder="Confirmare parolă nouă" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-gray-100 text-gray-900 placeholder:text-gray-500 rounded-lg p-3 border-none focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
           {passwordChangeError && <p className="text-red-500 text-sm">{passwordChangeError}</p>}
           {passwordChangeSuccess && <p className="text-green-500 text-sm">{passwordChangeSuccess}</p>}
           <button type="submit" className="w-full py-3 rounded-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors duration-200">
             Salvează Parola
           </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        <button
          onClick={onLogout}
          className="w-full text-center p-4 font-semibold text-red-500 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        >
          Deconectare
        </button>
      </div>

      <div className="text-center text-gray-400 text-xs space-y-1 pt-2">
            <p>Versiune {appVersion}</p>
      </div>
    </div>
  );
};