import React, { useState } from 'react';
import type { AppSettings } from '../types';
import { GeofenceMapModal } from './GeofenceMapModal';
import { MapPin, DollarSign, Moon, Sun } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange }) => {
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Handler simplu pentru setare punct de lucru
  const handleSetWorkPoint = async () => {
    if (isCapturingLocation) return;

    setPermissionError(null);
    setIsCapturingLocation(true);

    try {
      // Use Web Geolocation API directly
      console.log('[Agent ZONA] Folosesc Web Geolocation API...');

      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.log('[Agent ZONA] High accuracy failed, trying low accuracy...', error);
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 60000
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          }
        );
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log('[Agent ZONA] Coordonate capturate:', { lat, lng });

      setTempCoordinates({ lat, lng });
      setShowMapModal(true);
      setPermissionError(null);
    } catch (error: any) {
      console.error('[Agent ZONA] Eroare capturare GPS:', error);
      if (error.code === 1) {
        setPermissionError('denied');
      } else {
        setPermissionError('gps');
      }
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleMapConfirm = (lat: number, lng: number, radius: number) => {
    console.log('[Agent ZONA] Salvare finală:', { lat, lng, radius });
    onSettingsChange({
      ...settings,
      gateLatitude: lat,
      gateLongitude: lng,
      geofenceRadius: radius,
      geofencingEnabled: true,
    });
    setShowMapModal(false);
    setTempCoordinates(null);
  };

  const handleMapCancel = () => {
    setShowMapModal(false);
    setTempCoordinates(null);
  };

  const appVersion = "6.0.0";

  return (
    <div className="space-y-6 animate-fade-in pb-48 px-2 md:px-0">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-7 mb-4 relative header-gradient-bg rounded-b-[32px] shadow-lg -mx-2">
        <h1 className="text-3xl font-black text-white mb-1 tracking-tight drop-shadow-sm">
          Setări
        </h1>
        <p className="text-white/90 text-sm font-medium">
          Configurează aplicația după preferințele tale.
        </p>
      </header>

      {/* THEME CONFIG CARD */}
      <div className="card-v6 relative overflow-hidden rounded-[35px] transition-all duration-300">
        <Moon className="absolute top-[-10px] right-[-10px] w-48 h-48 text-white dark:text-gray-700 opacity-10 dark:opacity-5 pointer-events-none rotate-12" />

        <div className="p-6 relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Moon className="text-[#FFD700] w-6 h-6" />
                Configurare Aspect
              </h3>
              <p className="text-white/80 dark:text-gray-400 text-sm font-medium">Alege tema preferată</p>
            </div>

            <div className="bg-black/20 dark:bg-black/40 p-1.5 rounded-full flex items-center backdrop-blur-sm">
              <button
                onClick={() => onSettingsChange({ ...settings, theme: 'light' })}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${settings.theme !== 'dark'
                  ? 'bg-white text-blue-600 shadow-md scale-105'
                  : 'text-white/60 hover:text-white'}`}
              >
                <Sun className="w-3 h-3" />
                LIGHT
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, theme: 'dark' })}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${settings.theme === 'dark'
                  ? 'bg-[#0038FF] text-white shadow-lg scale-105 ring-2 ring-[#0038FF]/50'
                  : 'text-white/60 hover:text-white'}`}
              >
                <Moon className="w-3 h-3" />
                DARK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL CONFIG CARD */}
      <div className="card-v6 relative overflow-hidden rounded-[35px] transition-all duration-300">
        {/* Watermark Icon */}
        <DollarSign className="absolute -top-6 -right-6 w-64 h-64 text-white dark:text-gray-700 opacity-10 dark:opacity-5 pointer-events-none rotate-12" />

        <div className="p-6 relative z-10">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="text-[#00E5FF] w-6 h-6" />
              Configurare Financiară
            </h3>
            <p className="text-white/80 dark:text-gray-400 text-sm font-medium">Gestionează veniturile tale</p>
          </div>

          <div className="space-y-5">
            {/* User Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/90 dark:text-gray-400 uppercase tracking-widest pl-1">
                Nume Utilizator
              </label>
              <input
                type="text"
                value={settings.userName || ''}
                onChange={(e) => onSettingsChange({ ...settings, userName: e.target.value })}
                placeholder="Florin"
                className="w-full bg-blue-50/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-2xl px-5 py-4 font-bold text-xl text-[#1F2937] dark:text-white placeholder-[#1F2937]/50 dark:placeholder-gray-500 outline-none focus:bg-white/30 dark:focus:bg-gray-800 transition-all shadow-inner"
              />
            </div>

            {/* Salary */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/90 dark:text-gray-400 uppercase tracking-widest pl-1">
                Salariu Net (RON)
              </label>
              <input
                type="number"
                value={settings.monthlySalary || ''}
                onChange={(e) => onSettingsChange({ ...settings, monthlySalary: parseFloat(e.target.value) || 0 })}
                placeholder="4200"
                className="w-full bg-blue-50/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-2xl px-5 py-4 font-bold text-3xl text-[#1F2937] dark:text-white placeholder-[#1F2937]/50 dark:placeholder-gray-500 outline-none focus:bg-white/30 dark:focus:bg-gray-800 transition-all shadow-inner"
              />
            </div>

            {/* Meal Ticket Value */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/90 dark:text-gray-400 uppercase tracking-widest pl-1">
                Valoare Bon Masă (RON)
              </label>
              <input
                type="number"
                value={settings.mealTicketValue || ''}
                onChange={(e) => onSettingsChange({ ...settings, mealTicketValue: parseFloat(e.target.value) || 0 })}
                placeholder="22"
                className="w-full bg-blue-50/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700 rounded-2xl px-5 py-4 font-bold text-3xl text-[#1F2937] dark:text-white placeholder-[#1F2937]/50 dark:placeholder-gray-500 outline-none focus:bg-white/30 dark:focus:bg-gray-800 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GPS AUTOMATION CARD */}
      <div className="card-v6 relative overflow-hidden rounded-[35px] transition-all duration-300">
        {/* Background Decoration */}
        <MapPin className="absolute bottom-[-20px] right-[-20px] w-56 h-56 text-white dark:text-gray-700 opacity-10 dark:opacity-5 pointer-events-none" />

        <div className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-[#00C6FF] w-6 h-6" />
                Automatizare (GPS)
              </h3>
              <p className="text-white/80 dark:text-gray-400 text-sm font-medium pr-4">Pornește automat când ajungi la muncă</p>
            </div>

            {/* Toggle Switch */}
            <div className="bg-black/20 dark:bg-black/40 p-1.5 rounded-full flex items-center backdrop-blur-sm">
              <button
                onClick={() => onSettingsChange({ ...settings, geofencingEnabled: false })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!settings.geofencingEnabled
                  ? 'bg-white text-blue-600 shadow-md scale-105'
                  : 'text-white/60 hover:text-white'}`}
              >
                OFF
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, geofencingEnabled: true })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${settings.geofencingEnabled
                  ? 'bg-[#00E5FF] text-blue-900 shadow-lg scale-105'
                  : 'text-white/60 hover:text-white'}`}
              >
                ON
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Set Location Button */}
            <button
              onClick={handleSetWorkPoint}
              disabled={isCapturingLocation}
              className="w-full bg-white/20 dark:bg-gray-800/50 hover:bg-white/30 dark:hover:bg-gray-700/50 active:scale-98 backdrop-blur-md border border-white/30 dark:border-gray-600 rounded-2xl py-5 text-white font-bold flex items-center justify-center gap-3 transition-all shadow-lg group"
            >
              <div className={`p-2 rounded-full ${isCapturingLocation ? 'bg-gray-400' : 'bg-red-500'} shadow-md group-hover:scale-110 transition-transform`}>
                <MapPin className="w-5 h-5 text-white" fill="currentColor" />
              </div>
              <span className="text-lg tracking-tight">
                {isCapturingLocation ? 'Se capturează...' : 'Setează Locația Curentă'}
              </span>
            </button>

            {/* Permission Error Messages */}
            {permissionError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 backdrop-blur-md">
                <p className="text-white font-bold text-sm mb-1">⚠️ {permissionError === 'denied' ? 'Permisiune Respinsă' : 'Eroare GPS'}</p>
                <p className="text-white/80 text-xs">Verifică setările de locație ale telefonului.</p>
                <button onClick={() => setPermissionError(null)} className="mt-2 text-xs font-bold text-white underline">Închide</button>
              </div>
            )}

            {/* Active Location Display */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center backdrop-blur-sm shadow-inner relative">
              <p className="text-[10px] font-bold text-white/60 dark:text-gray-400 uppercase tracking-widest mb-2">LOCAȚIE ACTIVĂ</p>
              {settings.gateLatitude ? (
                <p className="font-mono text-white text-lg font-bold tracking-wider text-shadow-sm">
                  {settings.gateLatitude.toFixed(5)}, {settings.gateLongitude?.toFixed(5)}
                </p>
              ) : (
                <p className="text-white/40 italic text-sm">Nespecificată</p>
              )}
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-xs font-bold text-white/90 dark:text-gray-400 uppercase tracking-widest pl-1">
                  Rază: <span className="text-white text-lg ml-1">{settings.geofenceRadius || 300}M</span>
                </label>
              </div>
              <div className="relative h-2 bg-black/20 dark:bg-black/50 rounded-full">
                <div
                  className="absolute left-0 top-0 h-full bg-[#00E5FF] rounded-full"
                  style={{ width: `${((settings.geofenceRadius || 400) - 100) / (1000 - 100) * 100}%` }}
                />
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={settings.geofenceRadius || 400}
                  onChange={(e) => onSettingsChange({ ...settings, geofenceRadius: Number(e.target.value) })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-4 border-[#00E5FF] pointer-events-none transition-all"
                  style={{ left: `calc(${((settings.geofenceRadius || 400) - 100) / (1000 - 100) * 100}% - 16px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-white/40 dark:text-gray-500 mt-3 px-1">
                <span>100M</span>
                <span>1000M</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="text-center text-gray-400 dark:text-gray-600 text-[10px] font-mono mt-8 pb-8 opacity-50">
        v{appVersion} • {settings.userName ? settings.userName : 'Guest'}
      </div>

      {/* Map Modal */}
      {tempCoordinates && (
        <GeofenceMapModal
          isOpen={showMapModal}
          currentLat={tempCoordinates.lat}
          currentLng={tempCoordinates.lng}
          initialRadius={settings.geofenceRadius || 400}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      )}
    </div>
  );
};