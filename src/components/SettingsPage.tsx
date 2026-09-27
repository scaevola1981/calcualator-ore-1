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
    <div className="space-y-6 animate-fade-in pb-[125px] px-4">
      {/* HEADER NEO-SKEUOMORPHIC */}
      <header className="px-6 header-safe-top pb-6 nm-card !rounded-t-none !rounded-b-[32px] border-t-0 -mx-4 relative z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--nm-text)] tracking-tight flex items-center gap-2">
              Setări ⚙️
            </h1>
            <div className="nm-inset px-3 py-1 mt-2 inline-flex items-center gap-2">
              <span className="nm-led nm-led-indigo"></span>
              <p className="text-xs font-bold text-[var(--nm-text-muted)]">
                Personalizare Salariu, Beneficii & Siguranță
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 1. CONFIGURARE ASPECT (THEME) */}
      <div className="nm-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl nm-inset text-amber-500 shadow-inner">
              {settings.theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--nm-text)]">Tematică Aplicație</h3>
              <p className="text-xs text-[var(--nm-text-muted)]">
                {settings.theme === 'dark' ? 'Mod Întunecat (Dark Neo-Skeuomorphic)' : 'Mod Luminos (Light Neo-Skeuomorphic)'}
              </p>
            </div>
          </div>

          <div className="nm-inset p-1.5 rounded-2xl flex items-center w-full sm:w-auto">
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'light' })}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                settings.theme === 'light'
                  ? 'nm-card-sm text-amber-600 font-black scale-100 shadow-sm'
                  : 'text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]'
              }`}
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'dark' })}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                settings.theme === 'dark'
                  ? 'nm-card-sm text-blue-500 font-black scale-100 shadow-sm'
                  : 'text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]'
              }`}
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURARE SALARIZARE & TICHETE */}
      <div className="nm-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--nm-border)]">
          <div className="p-3 rounded-2xl nm-inset text-emerald-500 shadow-inner">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--nm-text)]">Salariu & Beneficii</h3>
            <p className="text-xs text-[var(--nm-text-muted)]">Valori de referință pentru calculul de lichidare</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Salariu Net de Bază */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Salariu Net de Bază (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.monthlySalary || 4200}
                onChange={(e) => onSettingsChange({ ...settings, monthlySalary: parseFloat(e.target.value) || 0 })}
                className="w-full nm-inset rounded-2xl px-4 py-3.5 text-[var(--nm-text)] font-mono font-bold focus:outline-none transition-all"
                placeholder="4200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--nm-text-muted)]">RON</span>
            </div>
          </div>

          {/* Salariu Brut de Încadrare */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Salariu Brut de Încadrare (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.grossSalary || 7180}
                onChange={(e) => onSettingsChange({ ...settings, grossSalary: parseFloat(e.target.value) || 0 })}
                className="w-full nm-inset rounded-2xl px-4 py-3.5 text-[var(--nm-text)] font-mono font-bold focus:outline-none transition-all"
                placeholder="7180"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--nm-text-muted)]">RON</span>
            </div>
          </div>

          {/* Valoare Bon Masă */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Valoare Bon Masă (RON / Zi)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.mealTicketValue || 22}
                onChange={(e) => onSettingsChange({ ...settings, mealTicketValue: parseFloat(e.target.value) || 0 })}
                className="w-full nm-inset rounded-2xl px-4 py-3.5 text-[var(--nm-text)] font-mono font-bold focus:outline-none transition-all"
                placeholder="22"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--nm-text-muted)]">RON</span>
            </div>
          </div>

          {/* Avans Standard */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Avans Lunar Standard (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.standardAdvance || 1500}
                onChange={(e) => onSettingsChange({ ...settings, standardAdvance: parseFloat(e.target.value) || 0 })}
                className="w-full nm-inset rounded-2xl px-4 py-3.5 text-[var(--nm-text)] font-mono font-bold focus:outline-none transition-all"
                placeholder="1500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--nm-text-muted)]">RON</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DATE IDENTIFICARE SALARIAT & RAPORTARE OFICIALĂ */}
      <div className="nm-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--nm-border)]">
          <div className="p-3 rounded-2xl nm-inset text-blue-500 shadow-inner">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--nm-text)]">Date Salariat & Pontaj Oficial</h3>
            <p className="text-xs text-[var(--nm-text-muted)]">Informații afișate în rapoartele PDF și Excel</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Nume și Prenume */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Nume și Prenume
            </label>
            <input
              type="text"
              value={settings.userName || ''}
              onChange={(e) => onSettingsChange({ ...settings, userName: e.target.value })}
              className="w-full nm-inset rounded-2xl px-4 py-3 text-[var(--nm-text)] font-bold text-sm focus:outline-none transition-all"
              placeholder="Dorobanțu Nicolae-Florin"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Marcă Angajat */}
            <div>
              <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
                Marcă Angajat
              </label>
              <input
                type="text"
                value={settings.employeeId || ''}
                onChange={(e) => onSettingsChange({ ...settings, employeeId: e.target.value })}
                className="w-full nm-inset rounded-2xl px-4 py-3 text-[var(--nm-text)] font-bold text-sm focus:outline-none transition-all"
                placeholder="AFD1270"
              />
            </div>

            {/* Funcție */}
            <div>
              <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
                Funcție / Calificare
              </label>
              <input
                type="text"
                value={settings.jobTitle || ''}
                onChange={(e) => onSettingsChange({ ...settings, jobTitle: e.target.value })}
                className="w-full nm-inset rounded-2xl px-4 py-3 text-[var(--nm-text)] font-bold text-sm focus:outline-none transition-all"
                placeholder="Lăcătuș mecanic"
              />
            </div>
          </div>

          {/* Companie */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Companie / Angajator
            </label>
            <input
              type="text"
              value={settings.companyName || ''}
              onChange={(e) => onSettingsChange({ ...settings, companyName: e.target.value })}
              className="w-full nm-inset rounded-2xl px-4 py-3 text-[var(--nm-text)] font-bold text-sm focus:outline-none transition-all"
              placeholder="AVICARVIL FOOD & DISTRIBUTION"
            />
          </div>

          {/* Departament */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-1">
              Departament / Secție
            </label>
            <input
              type="text"
              value={settings.department || ''}
              onChange={(e) => onSettingsChange({ ...settings, department: e.target.value })}
              className="w-full nm-inset rounded-2xl px-4 py-3 text-[var(--nm-text)] font-bold text-sm focus:outline-none transition-all"
              placeholder="Întreținere și mentenanță"
            />
          </div>
        </div>
      </div>

      {/* 4. ALERTE INTELIGENTE & NOTIFICĂRI DE TURĂ */}
      <div className="nm-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--nm-border)]">
          <div className="p-3 rounded-2xl nm-inset text-indigo-500 shadow-inner">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--nm-text)]">Alerte Inteligente de Tură</h3>
            <p className="text-xs text-[var(--nm-text-muted)]">Notificări automate la 8 ore și 12 ore de lucru</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 nm-inset rounded-2xl">
          <div className="pr-4">
            <span className="text-sm font-black text-[var(--nm-text)] block">
              Avertizări depășire normă & tură lungă
            </span>
            <p className="text-xs text-[var(--nm-text-muted)] mt-1">
              Notificare când completezi norma de 8 ore (încep orele suplimentare) și memento de siguranță dacă pontajul depășește 12 ore.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange({ ...settings, smartAlertsEnabled: !(settings.smartAlertsEnabled ?? true) })}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-all nm-inset shrink-0 ${
              (settings.smartAlertsEnabled ?? true) ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`w-6 h-6 rounded-full nm-card-sm transition-transform ${
              (settings.smartAlertsEnabled ?? true) ? 'bg-blue-600' : 'bg-gray-400'
            }`} />
          </button>
        </div>
      </div>

      {/* 5. SIGURANȚĂ DATE & BACKUP */}
      <div className="nm-card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--nm-border)]">
          <div className="p-3 rounded-2xl nm-inset text-emerald-500 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--nm-text)]">Siguranță Date & Backup</h3>
            <p className="text-xs text-[var(--nm-text-muted)]">
              {workSessions.length} sesiuni salvate local în telefon
            </p>
          </div>
        </div>

        {backupMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            backupMessage.type === 'success'
              ? 'nm-inset text-emerald-600 dark:text-emerald-400'
              : 'nm-inset text-rose-600 dark:text-rose-400'
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
            className="nm-btn !p-3.5 !rounded-2xl text-blue-500 font-black text-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <Download size={16} />
            <span>Exportă Backup (JSON)</span>
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
              className="w-full nm-btn !p-3.5 !rounded-2xl text-emerald-500 font-black text-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload size={16} />
              <span>Restaurează din Backup</span>
            </button>
          </div>
        </div>

        {/* Modal Confirmare Import */}
        {showImportConfirm && (
          <div className="nm-card p-4 border-l-4 border-l-amber-500 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-500 font-black text-xs">
              <AlertTriangle size={16} />
              <span>Cum dorești să aplici restaurarea datelor?</span>
            </div>
            <p className="text-[11px] text-[var(--nm-text-muted)]">
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
                className="flex-1 py-2.5 px-3 nm-power-btn-start text-white font-black rounded-xl text-xs active:scale-95"
              >
                Îmbină datele
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
                className="flex-1 py-2.5 px-3 nm-power-btn-stop text-white font-black rounded-xl text-xs active:scale-95"
              >
                Înlocuiește tot
              </button>
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportContent(null);
                }}
                className="py-2.5 px-3 nm-btn text-[var(--nm-text-muted)] font-black rounded-xl text-xs"
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
          className="w-full nm-btn !py-4 !px-4 !rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-[var(--nm-text)] active:scale-98"
        >
          <RotateCw size={16} />
          <span>Reîmprospătează Aplicația & Curăță Cache</span>
        </button>
      </div>

      {/* VERSION FOOTER */}
      <div className="text-center py-4">
        <div className="nm-inset-sm px-4 py-1.5 inline-block rounded-xl">
          <p className="text-xs text-[var(--nm-text-muted)] font-mono font-bold">
            Pontaj & Calculator v{appVersion} • {settings.userName || 'Florin'}
          </p>
        </div>
      </div>
    </div>
  );
};