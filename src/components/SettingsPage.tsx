import React, { useState } from 'react';
import {
  Sun,
  Moon,
  DollarSign,
  MapPin,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import type { AppSettings } from '../types';
import type { GeofencingState } from '../hooks/useGeofencing';
import { GeofenceMapModal } from './GeofenceMapModal';
import { Geolocation } from '@capacitor/geolocation';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  geofenceState?: GeofencingState;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange, geofenceState }) => {
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleSetWorkPoint = async () => {
    setIsCapturingLocation(true);
    setPermissionError(null);

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      const lat = Number.isFinite(position?.coords?.latitude)
        ? position.coords.latitude
        : (Number.isFinite(settings.gateLatitude) ? settings.gateLatitude! : 44.4268);
      const lng = Number.isFinite(position?.coords?.longitude)
        ? position.coords.longitude
        : (Number.isFinite(settings.gateLongitude) ? settings.gateLongitude! : 26.1025);
      setTempCoordinates({ lat, lng });
      setShowMapModal(true);
    } catch (err: any) {
      console.error('Error getting location:', err);
      if (err.message && err.message.includes('denied')) {
        setPermissionError('denied');
      } else {
        setPermissionError('generic');
      }
      const fallbackLat = Number.isFinite(settings.gateLatitude) ? settings.gateLatitude! : 44.4268;
      const fallbackLng = Number.isFinite(settings.gateLongitude) ? settings.gateLongitude! : 26.1025;
      setTempCoordinates({
        lat: fallbackLat,
        lng: fallbackLng
      });
      setShowMapModal(true);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleMapConfirm = (lat: number, lng: number, radius?: number) => {
    onSettingsChange({
      ...settings,
      gateLatitude: lat,
      gateLongitude: lng,
      geofenceRadius: radius || settings.geofenceRadius || 400,
      geofencingEnabled: true
    });
    setShowMapModal(false);
    setTempCoordinates(null);
  };

  const handleMapCancel = () => {
    setShowMapModal(false);
    setTempCoordinates(null);
  };

  const handleToggleGps = async (enabled: boolean) => {
    if (enabled) {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            setPermissionError('denied');
            return;
          }
        }
      } catch (e) {
        console.warn('Eroare verificare permisiuni GPS:', e);
      }
    }
    onSettingsChange({ ...settings, geofencingEnabled: enabled });
    if (enabled && geofenceState?.refreshPosition) {
      setTimeout(() => geofenceState.refreshPosition(), 300);
    }
  };

  const appVersion = "6.2.0";

  return (
    <div className="space-y-5 animate-fade-in pb-48 px-4">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-7 header-gradient-bg rounded-b-[32px] shadow-lg text-white -mx-4">
        <h1 className="text-2xl sm:text-3xl font-black mb-1 tracking-tight drop-shadow-sm">
          Setări ⚙️
        </h1>
        <p className="text-white/90 text-xs sm:text-sm font-medium">
          Personalizează tematica, salariul și geofencing-ul GPS
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

      {/* 3. AUTOMATIZARE GPS (GEOFENCING) */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Automatizare GPS</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Pontaj automat la sosirea și plecarea de la muncă
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="bg-gray-100 dark:bg-black/40 p-1 rounded-full flex items-center border border-gray-200/50 dark:border-white/5">
            <button
              onClick={() => handleToggleGps(false)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                !settings.geofencingEnabled
                  ? 'bg-white text-gray-900 shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              OFF
            </button>
            <button
              onClick={() => handleToggleGps(true)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                settings.geofencingEnabled
                  ? 'bg-teal-500 text-white shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ON
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Buton Setare Locație */}
          <button
            onClick={handleSetWorkPoint}
            disabled={isCapturingLocation}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-2xl py-4 text-white font-bold flex items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-500/20"
          >
            <MapPin className="w-5 h-5" />
            <span>{isCapturingLocation ? 'Se capturează GPS...' : 'Setează Punct de Lucru'}</span>
          </button>

          {permissionError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>
                {permissionError === 'denied'
                  ? 'Accesul la locație a fost refuzat. Activează permisiunea din setările telefonului.'
                  : 'Nu s-a putut obține locația GPS exactă. S-au folosit coordonate implicite pe care le poți ajusta pe hartă.'}
              </span>
            </div>
          )}

          {/* Locație Activă */}
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Coordonate Punct de Lucru
            </p>
            {settings.gateLatitude ? (
              <p className="font-mono text-gray-900 dark:text-white text-sm font-bold">
                {settings.gateLatitude.toFixed(5)}, {settings.gateLongitude?.toFixed(5)}
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-xs italic">
                Nespecificate (Apasă butonul de mai sus pentru setare)
              </p>
            )}
          </div>

          {/* Status Live Geofence */}
          {settings.geofencingEnabled && settings.gateLatitude && (
            <div className={`p-4 rounded-2xl border text-xs flex flex-col gap-2.5 transition-all ${
              geofenceState?.isInZone
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : geofenceState?.error
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <span className={`w-2.5 h-2.5 rounded-full ${geofenceState?.isInZone ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                  <span className="text-xs">
                    {geofenceState?.isInZone
                      ? '🟢 În raza punctului de lucru (Pontaj activ)'
                      : geofenceState?.error
                      ? `⚠️ ${geofenceState.error}`
                      : '⚪ În afara razei punctului de lucru'}
                  </span>
                </div>
                <button
                  onClick={() => geofenceState?.refreshPosition()}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-white text-[11px] font-bold shadow-sm transition-all text-gray-800 dark:text-white"
                >
                  Actualizează GPS
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] opacity-90 font-medium">
                <span>Distanță față de punct:</span>
                <span className="font-mono font-bold">
                  {geofenceState?.currentDistance !== null && geofenceState?.currentDistance !== undefined
                    ? (geofenceState.currentDistance > 1000
                        ? `${(geofenceState.currentDistance / 1000).toFixed(2)} km`
                        : `${geofenceState.currentDistance} m`)
                    : 'Se determină...'}
                </span>
              </div>

              {geofenceState?.accuracy && (
                <div className="flex justify-between items-center text-[10px] opacity-75">
                  <span>Acuratețe semnal GPS:</span>
                  <span className="font-mono">±{geofenceState.accuracy}m</span>
                </div>
              )}
            </div>
          )}

          {/* Rază Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rază Geofence
              </label>
              <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                {settings.geofenceRadius || 400}m
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={settings.geofenceRadius || 400}
              onChange={(e) => onSettingsChange({ ...settings, geofenceRadius: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
              <span>100m</span>
              <span>500m</span>
              <span>1000m</span>
            </div>
          </div>
        </div>
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

      {/* MAP MODAL */}
      {showMapModal && tempCoordinates && (
        <GeofenceMapModal
          isOpen={showMapModal}
          currentLat={tempCoordinates.lat}
          currentLng={tempCoordinates.lng}
          initialLat={tempCoordinates.lat}
          initialLng={tempCoordinates.lng}
          initialRadius={settings.geofenceRadius || 400}
          radius={settings.geofenceRadius || 400}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      )}
    </div>
  );
};