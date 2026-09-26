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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-fade-in modal-safe-inset">
      <div className="nm-card !rounded-[32px] w-full max-w-lg overflow-hidden my-auto flex flex-col text-[var(--nm-text)] border border-[var(--nm-border)] shadow-2xl">
        
        {/* HEADER NEO-SKEUOMORPHIC */}
        <div className="px-6 py-5 border-b border-[var(--nm-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl nm-inset text-indigo-500 flex items-center justify-center font-black shadow-inner">
              <Moon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-[var(--nm-text)]">Schimbul 2</h3>
                <span className="nm-inset-sm px-2 py-0.5 text-[10px] font-black uppercase text-indigo-500 flex items-center gap-1.5">
                  <span className="nm-led nm-led-indigo !w-1.5 !h-1.5"></span>
                  Start 16:30
                </span>
              </div>
              <p className="text-xs text-[var(--nm-text-muted)] font-bold capitalize mt-0.5">
                {formattedDateStr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="nm-btn-round !w-9 !h-9 text-[var(--nm-text-muted)] hover:text-[var(--nm-text)]"
            title="Închide"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORP MODAL */}
        <div className="p-6 space-y-5">

          {/* 1. BUTOANE RAPIDE PENTRU ORA DE PLECARE */}
          <div>
            <label className="text-xs font-black text-[var(--nm-text-muted)] uppercase tracking-wider block mb-2.5">
              La ce oră ai terminat tura? (Ieșire 1-Click)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {SHIFT_2_COMMON_EXITS.map((opt) => {
                const isSelected = selectedHour === opt.endHour && selectedMinute === opt.endMinute;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleSelectQuickExit(opt)}
                    className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center font-black text-sm transition-all active:scale-95 ${
                      isSelected
                        ? 'nm-card-sm text-indigo-600 dark:text-indigo-400 scale-105 border border-indigo-500/40 shadow-md'
                        : 'nm-btn text-[var(--nm-text)]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-indigo-500' : 'text-[var(--nm-text-muted)]'}`}>
                      noaptea
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SELECTOR PRECIS ORĂ / MINUT */}
          <div className="nm-inset p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[var(--nm-text)]">
                Altă oră de plecare:
              </span>
              <span className={`nm-inset-sm px-2.5 py-0.5 text-[10px] font-black uppercase ${
                selectedHour >= 22 ? 'text-amber-500' : 'text-indigo-500'
              }`}>
                {selectedHour >= 22 ? '🌙 Aceeași seară' : '🌌 Ziua următoare'}
              </span>
            </div>

            {/* Selector Digital Oră : Minut */}
            <div className="flex items-center justify-center gap-3 py-1">
              {/* ORA */}
              <div className="flex flex-col items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--nm-text-muted)] mb-1">
                  Ora
                </label>
                <div className="relative">
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                    className="w-24 sm:w-28 h-12 text-center nm-card rounded-2xl font-mono text-2xl font-black text-[var(--nm-text)] focus:outline-none cursor-pointer appearance-none"
                    style={{ textAlignLast: 'center' }}
                  >
                    {[22, 23, 0, 1, 2, 3, 4, 5, 6, 7].map((h) => (
                      <option key={h} value={h} className="bg-[var(--nm-bg)] text-[var(--nm-text)] font-mono text-base">
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nm-text-muted)] text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              <span className="text-3xl font-black text-indigo-500 mt-5">:</span>

              {/* MINUT */}
              <div className="flex flex-col items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--nm-text-muted)] mb-1">
                  Minut
                </label>
                <div className="relative">
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                    className="w-24 sm:w-28 h-12 text-center nm-card rounded-2xl font-mono text-2xl font-black text-[var(--nm-text)] focus:outline-none cursor-pointer appearance-none"
                    style={{ textAlignLast: 'center' }}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m} className="bg-[var(--nm-bg)] text-[var(--nm-text)] font-mono text-base">
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--nm-text-muted)] text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Scurt info interval */}
            <div className="text-center text-xs font-bold text-[var(--nm-text-muted)]">
              Program tură:{' '}
              <span className="font-mono font-black text-[var(--nm-text)]">16:30</span>
              {' ➔ '}
              <span className="font-mono font-black text-indigo-500">
                {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
              </span>
              {' '}
              <span className="text-[11px] text-[var(--nm-text-muted)]">
                ({selectedHour >= 22 ? 'aceeași seară' : 'ziua următoare'})
              </span>
            </div>
          </div>

          {/* 3. CALCUL AUTOMAT DETALIAT & TRANSPARENT */}
          <div className="nm-card p-4 space-y-3 border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-500 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Calcul Automat Schimbul 2:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-[var(--nm-text-muted)] block font-bold">Normă</span>
                <span className="text-base font-black text-[var(--nm-text)]">
                  {stats.normalHours} ore
                </span>
              </div>

              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-purple-500 block font-bold">Suplimentare</span>
                <span className="text-base font-black text-purple-600 dark:text-purple-400">
                  {stats.overtimeHours} ore
                </span>
                <span className="text-[9px] text-[var(--nm-text-muted)] block leading-tight">-30m pauză</span>
              </div>

              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-indigo-500 block font-bold">Spor Noapte</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  {stats.nightHours} ore
                </span>
                <span className="text-[9px] text-indigo-500 block leading-tight">după 22:00</span>
              </div>

              <div className="nm-inset-sm p-2.5">
                <span className="text-[10px] text-emerald-500 block font-bold">Total Pontat</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {stats.totalEffective} ore
                </span>
              </div>
            </div>
          </div>

          {/* 4. BUTON PRINCIPAL DE SALVARE */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full nm-power-btn-start !py-4 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 text-base active:scale-98"
          >
            <Check size={20} />
            <span>
              Salvează Schimbul 2 (16:30 – {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')})
            </span>
          </button>

          {/* 5. OPȚIUNE LIVE (Dacă utilizatorul este la muncă astăzi) */}
          {isToday && onStartLiveTimerFrom1630 && (
            <div className="pt-2 border-t border-[var(--nm-border)]">
              <button
                type="button"
                onClick={() => {
                  onStartLiveTimerFrom1630();
                  onClose();
                }}
                className="w-full nm-btn !py-3 !px-4 !rounded-2xl text-indigo-500 font-black text-xs flex items-center justify-center gap-2 active:scale-98"
              >
                <Clock size={16} />
                <span>Pornește Cronometrul Live acum (Start la 16:30)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
