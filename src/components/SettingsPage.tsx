import React, { useRef, useState } from 'react';
import {
  Sun,
  Moon,
  DollarSign,
  RotateCw,
  User,
  Shield,
  Download,
  Upload,
  Bell,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { AppSettings, WorkSession } from '../types';
import { exportBackupToFile, parseBackupData } from '../utils/backupService';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  workSessions?: WorkSession[];
  onSessionsChange?: (newSessions: WorkSession[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSettingsChange,
  workSessions = [],
  onSessionsChange,
}) => {
  const appVersion = "6.3.0";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);

  return (
    <div className="space-y-5 animate-fade-in pb-48 px-4">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-7 header-gradient-bg rounded-b-[32px] shadow-lg text-white -mx-4">
        <h1 className="text-2xl sm:text-3xl font-black mb-1 tracking-tight drop-shadow-sm">
          Setări ⚙️
        </h1>
        <p className="text-white/90 text-xs sm:text-sm font-medium">
          Personalizează tematica și valorile financiare
        </p>
      </header>

      {/* 1. CONFIGURARE ASPECT (THEME) */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
              {settings.theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tematică Aplicație</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {settings.theme === 'dark' ? 'Mod Întunecat (Dark)' : 'Mod Luminos (Light)'}
              </p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-black/40 p-1 rounded-full flex items-center border border-gray-200/50 dark:border-white/5">
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'light' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                settings.theme === 'light'
                  ? 'bg-white text-gray-900 shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'dark' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                settings.theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURARE SALARIZARE & TICHETE */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Salariu & Beneficii</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Valori de referință pentru calcule</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Salariu Net de Bază */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Salariu Net de Bază (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.monthlySalary || 4200}
                onChange={(e) => onSettingsChange({ ...settings, monthlySalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="4200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>

          {/* Salariu Brut de Încadrare */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Salariu Brut de Încadrare (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.grossSalary || 7180}
                onChange={(e) => onSettingsChange({ ...settings, grossSalary: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="7180"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>

          {/* Valoare Bon Masă */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Valoare Bon Masă (RON / Zi)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.mealTicketValue || 22}
                onChange={(e) => onSettingsChange({ ...settings, mealTicketValue: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="22"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>

          {/* Avans Standard */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Avans Lunar Standard (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.standardAdvance || 1500}
                onChange={(e) => onSettingsChange({ ...settings, standardAdvance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="1500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DATE IDENTIFICARE SALARIAT & RAPORTARE OFICIALĂ */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Date Salariat & Pontaj Oficial</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Informații afișate în rapoartele PDF și Excel</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Nume și Prenume */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Nume și Prenume
            </label>
            <input
              type="text"
              value={settings.userName || ''}
              onChange={(e) => onSettingsChange({ ...settings, userName: e.target.value })}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              placeholder="Dorobanțu Nicolae-Florin"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Marcă Angajat */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Marcă Angajat
              </label>
              <input
                type="text"
                value={settings.employeeId || ''}
                onChange={(e) => onSettingsChange({ ...settings, employeeId: e.target.value })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="AFD1270"
              />
            </div>

            {/* Funcție */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                Funcție / Calificare
              </label>
              <input
                type="text"
                value={settings.jobTitle || ''}
                onChange={(e) => onSettingsChange({ ...settings, jobTitle: e.target.value })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="Lăcătuș mecanic"
              />
            </div>
          </div>

          {/* Companie */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Companie / Angajator
            </label>
            <input
              type="text"
              value={settings.companyName || ''}
              onChange={(e) => onSettingsChange({ ...settings, companyName: e.target.value })}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              placeholder="AVICARVIL FOOD & DISTRIBUTION"
            />
          </div>

          {/* Departament */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Departament / Secție
            </label>
            <input
              type="text"
              value={settings.department || ''}
              onChange={(e) => onSettingsChange({ ...settings, department: e.target.value })}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              placeholder="Întreținere și mentenanță"
            />
          </div>
        </div>
      </div>

      {/* 4. ALERTE INTELIGENTE & NOTIFICĂRI DE TURĂ */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Alerte Inteligente de Tură</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Notificări automate la 8 ore și 12 ore de lucru</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
          <div className="pr-4">
            <span className="text-sm font-bold text-gray-900 dark:text-white block">
              Avertizări depășire normă & tură lungă
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Notificare când completezi norma de 8 ore (încep orele suplimentare) și memento de siguranță dacă pontajul depășește 12 ore.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, smartAlertsEnabled: !(settings.smartAlertsEnabled ?? true) })}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none shrink-0 ${
              (settings.smartAlertsEnabled ?? true) ? 'bg-blue-600 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md transition-transform" />
          </button>
        </div>
      </div>

      {/* 5. SIGURANȚĂ DATE & BACKUP */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Siguranță Date & Backup</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {workSessions.length} sesiuni salvate local în telefon
            </p>
          </div>
        </div>

        {backupMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            backupMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {backupMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{backupMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Export */}
          <button
            onClick={() => {
              try {
                exportBackupToFile(workSessions, settings);
                setBackupMessage({
                  text: `Backup generat cu succes! Fișierul conține ${workSessions.length} sesiuni și toate setările.`,
                  type: 'success',
                });
                setTimeout(() => setBackupMessage(null), 5000);
              } catch (err) {
                setBackupMessage({
                  text: 'Eroare la generarea fișierului de backup.',
                  type: 'error',
                });
              }
            }}
            className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
          >
            <Download size={16} />
            <span>Exportă Backup (Fișier JSON)</span>
          </button>

          {/* Import */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const content = event.target?.result as string;
                  if (content) {
                    setPendingImportContent(content);
                    setShowImportConfirm(true);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
            >
              <Upload size={16} />
              <span>Restaurează din Backup (Import)</span>
            </button>
          </div>
        </div>

        {/* Modal Confirmare Import */}
        {showImportConfirm && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
              <AlertTriangle size={16} />
              <span>Cum dorești să aplici restaurarea datelor?</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Poți îmbina datele din backup cu cele existente (fără duplicate) sau poți înlocui complet istoricul actual.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!pendingImportContent) return;
                  const result = parseBackupData(pendingImportContent, workSessions, 'merge');
                  if (result.success && result.sessions) {
                    if (onSessionsChange) onSessionsChange(result.sessions);
                    if (result.settings) onSettingsChange({ ...settings, ...result.settings });
                    setBackupMessage({
                      text: `${result.message} (Îmbinare fără duplicate).`,
                      type: 'success',
                    });
                  } else {
                    setBackupMessage({
                      text: result.message || 'Format de backup invalid.',
                      type: 'error',
                    });
                  }
                  setShowImportConfirm(false);
                  setPendingImportContent(null);
                  setTimeout(() => setBackupMessage(null), 6000);
                }}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                Îmbină datele (Recomandat)
              </button>
              <button
                onClick={() => {
                  if (!pendingImportContent) return;
                  const result = parseBackupData(pendingImportContent, workSessions, 'replace');
                  if (result.success && result.sessions) {
                    if (onSessionsChange) onSessionsChange(result.sessions);
                    if (result.settings) onSettingsChange({ ...settings, ...result.settings });
                    setBackupMessage({
                      text: `${result.message} (Înlocuire completă).`,
                      type: 'success',
                    });
                  } else {
                    setBackupMessage({
                      text: result.message || 'Format de backup invalid.',
                      type: 'error',
                    });
                  }
                  setShowImportConfirm(false);
                  setPendingImportContent(null);
                  setTimeout(() => setBackupMessage(null), 6000);
                }}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                Înlocuiește tot
              </button>
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportContent(null);
                }}
                className="py-2 px-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Anulează
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RESET / REFRESH APP BUTTON */}
      <div className="pt-2">
        <button
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => names.forEach(n => caches.delete(n)));
            }
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
            }
            window.location.reload();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-white/5 dark:bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
        >
          <RotateCw size={16} />
          <span>Reîmprospătează Aplicația & Curăță Cache</span>
        </button>
      </div>

      {/* VERSION FOOTER */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">
          TikTok Work v{appVersion} • {settings.userName || 'Alex'}
        </p>
      </div>
    </div>
  );
};