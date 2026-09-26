import React, { useState, useMemo } from 'react';
import { X, Moon, Clock, Check, Sparkles } from 'lucide-react';
import type { WorkSession } from '../types';
import {
  SHIFT_2_COMMON_EXITS,
  createShift2Session,
  Shift2ExitOption,
} from '../utils/shiftPresets';
import { calculateDurationWithBreak, calculateNightHours } from '../utils/timeRounding';

interface Shift2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: Date;
  onSaveSession: (session: WorkSession) => void;
  onStartLiveTimerFrom1630?: () => void;
  isToday?: boolean;
}

export const Shift2Modal: React.FC<Shift2ModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  onSaveSession,
  onStartLiveTimerFrom1630,
  isToday = false,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(2);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  // Calculează sesiunea bazată pe ora de sfârșit selectată
  const previewSession = useMemo(() => {
    return createShift2Session(targetDate, selectedHour, selectedMinute);
  }, [targetDate, selectedHour, selectedMinute]);

  // Calculează orele exacte (normale, suplimentare cu pauză dedusă, ore de noapte)
  const stats = useMemo(() => {
    const sStart = previewSession.startTime;
    const sEnd = previewSession.endTime;
    const totalDuration = calculateDurationWithBreak(sStart, sEnd);
    const nightH = calculateNightHours(sStart, sEnd);

    const normalLimit = 8;
    const normH = Math.min(totalDuration, normalLimit);
    const rawOvertime = Math.max(0, totalDuration - normalLimit);
    // Regula stabilită de Florin: 30 min pauză scăzută exclusiv din suplimentare
    const overtimeH = rawOvertime > 0 ? Math.max(0, rawOvertime - 0.5) : 0;
    const totalEffective = normH + overtimeH;

    return {
      grossDuration: totalDuration,
      normalHours: normH,
      overtimeHours: overtimeH,
      nightHours: nightH,
      totalEffective,
    };
  }, [previewSession]);

  if (!isOpen) return null;

  const handleSelectQuickExit = (exit: Shift2ExitOption) => {
    setSelectedHour(exit.endHour);
    setSelectedMinute(exit.endMinute);
  };

  const handleSave = () => {
    onSaveSession(previewSession);
    onClose();
  };

  const formattedDateStr = targetDate.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in modal-safe-inset">
      <div className="bg-white dark:bg-[#101F30] w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto flex flex-col text-gray-900 dark:text-white">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Moon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Schimbul 2</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Început Fix 16:30
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize mt-0.5">
                {formattedDateStr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORP MODAL */}
        <div className="p-6 space-y-5">

          {/* 1. BUTOANE RAPIDE PENTRU ORA DE PLECARE */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">
              La ce oră ai terminat tura? (Ieșire 1-Click)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SHIFT_2_COMMON_EXITS.map((opt) => {
                const isSelected = selectedHour === opt.endHour && selectedMinute === opt.endMinute;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleSelectQuickExit(opt)}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center font-bold text-sm transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-105'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:border-indigo-400'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                      noaptea
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SELECTOR PRECIS ORĂ / MINUT */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Altă oră de plecare:
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                selectedHour >= 22
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}>
                {selectedHour >= 22 ? '🌙 Aceeași seară' : '🌌 Ziua următoare'}
              </span>
            </div>

            {/* Selector Digital Oră : Minut */}
            <div className="flex items-center justify-center gap-2 py-1">
              {/* ORA */}
              <div className="flex flex-col items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Ora
                </label>
                <div className="relative">
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                    className="w-24 sm:w-28 h-12 text-center bg-white dark:bg-[#132337] border-2 border-indigo-400/40 dark:border-indigo-400/30 rounded-2xl font-mono text-2xl font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs appearance-none"
                    style={{ textAlignLast: 'center' }}
                  >
                    {[22, 23, 0, 1, 2, 3, 4, 5, 6, 7].map((h) => (
                      <option key={h} value={h} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white font-mono text-base">
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              <span className="text-3xl font-black text-indigo-500/80 mt-5">:</span>

              {/* MINUT */}
              <div className="flex flex-col items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Minut
                </label>
                <div className="relative">
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                    className="w-24 sm:w-28 h-12 text-center bg-white dark:bg-[#132337] border-2 border-indigo-400/40 dark:border-indigo-400/30 rounded-2xl font-mono text-2xl font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs appearance-none"
                    style={{ textAlignLast: 'center' }}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m} className="bg-white dark:bg-[#132337] text-gray-900 dark:text-white font-mono text-base">
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Scurt info interval */}
            <div className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
              Program tură:{' '}
              <span className="font-mono font-bold text-gray-900 dark:text-white">16:30</span>
              {' ➔ '}
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
              </span>
              {' '}
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                ({selectedHour >= 22 ? 'aceeași seară' : 'ziua următoare'})
              </span>
            </div>
          </div>

          {/* 3. CALCUL AUTOMAT DETALIAT & TRANSPARENT */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Calcul Automat Schimbul 2:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-white/80 dark:bg-white/5 rounded-xl border border-indigo-100 dark:border-white/10">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Normă</span>
                <span className="text-base font-black text-gray-900 dark:text-white">
                  {stats.normalHours} ore
                </span>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-white/5 rounded-xl border border-indigo-100 dark:border-white/10">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-medium">Suplimentare</span>
                <span className="text-base font-black text-purple-700 dark:text-purple-300">
                  {stats.overtimeHours} ore
                </span>
                <span className="text-[9px] text-gray-400 block leading-tight">-30m pauză</span>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-white/5 rounded-xl border border-indigo-100 dark:border-white/10">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium">Spor Noapte (25%)</span>
                <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                  {stats.nightHours} ore
                </span>
                <span className="text-[9px] text-indigo-500 block leading-tight">după 22:00</span>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-white/5 rounded-xl border border-indigo-100 dark:border-white/10">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">Total Pontat</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {stats.totalEffective} ore
                </span>
              </div>
            </div>
          </div>

          {/* 4. BUTON PRINCIPAL DE SALVARE */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 text-base"
          >
            <Check size={20} />
            <span>
              Salvează Schimbul 2 (16:30 – {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')})
            </span>
          </button>

          {/* 5. OPȚIUNE LIVE (Dacă utilizatorul este la muncă astăzi) */}
          {isToday && onStartLiveTimerFrom1630 && (
            <div className="pt-2 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  onStartLiveTimerFrom1630();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 border border-gray-200 dark:border-white/10 transition-all active:scale-98"
              >
                <Clock size={16} />
                <span>Pornește Cronometrul Live acum (Start setat la 16:30)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
