import React, { useState } from 'react';
import {
  Sun,
  Moon,
  DollarSign,
  MapPin,
  HelpCircle,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { AppSettings } from '../types';
import { GeofenceMapModal } from './GeofenceMapModal';
import { Geolocation } from '@capacitor/geolocation';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange }) => {
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

      const { latitude, longitude } = position.coords;
      setTempCoordinates({ lat: latitude, lng: longitude });
      setShowMapModal(true);
    } catch (err: any) {
      console.error('Error getting location:', err);
      if (err.message && err.message.includes('denied')) {
        setPermissionError('denied');
      } else {
        setPermissionError('generic');
      }
      setTempCoordinates({
        lat: settings.gateLatitude || 44.4268,
        lng: settings.gateLongitude || 26.1025
      });
      setShowMapModal(true);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleMapConfirm = (lat: number, lng: number) => {
    onSettingsChange({
      ...settings,
      gateLatitude: lat,
      gateLongitude: lng,
      geofencingEnabled: true
    });
    setShowMapModal(false);
    setTempCoordinates(null);
  };

  const handleMapCancel = () => {
    setShowMapModal(false);
    setTempCoordinates(null);
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
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Temă Interfață
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                Comută între Light și Dark Mode
              </p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-black/40 p-1 rounded-full flex items-center border border-gray-200/50 dark:border-white/5">
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'light' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                settings.theme !== 'dark'
                  ? 'bg-white text-blue-600 shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              LIGHT
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, theme: 'dark' })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                settings.theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              DARK
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURARE FINANCIARĂ */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Configurare Financiară
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
              Parametri contractuali și tichete
            </p>
          </div>
        </div>

        <div className="space-y-3.5 pt-2">
          {/* User Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
              Nume Utilizator
            </label>
            <input
              type="text"
              value={settings.userName || ''}
              onChange={(e) => onSettingsChange({ ...settings, userName: e.target.value })}
              placeholder="Florin"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 font-bold text-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Salariu Net de Baza */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
              Salariu Net de Bază (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.monthlySalary || ''}
                onChange={(e) => onSettingsChange({ ...settings, monthlySalary: parseFloat(e.target.value) || 0 })}
                placeholder="4200"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 font-bold text-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>

          {/* Salariu Brut de Incadrare */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
              Salariu Brut de Încadrare (RON)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.grossSalary || ''}
                onChange={(e) => onSettingsChange({ ...settings, grossSalary: parseFloat(e.target.value) || 0 })}
                placeholder="7180"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 font-bold text-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>

          {/* Valoare Tichet Masă */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
              Valoare Bon Masă (RON / zi)
            </label>
            <div className="relative">
              <input
                type="number"
                value={settings.mealTicketValue || ''}
                onChange={(e) => onSettingsChange({ ...settings, mealTicketValue: parseFloat(e.target.value) || 0 })}
                placeholder="22"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 font-bold text-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">RON</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUTOMATIZARE GEOFENCING (GPS) */}
      <div className="bg-white dark:bg-[#132337]/85 border border-gray-100 dark:border-white/10 rounded-[28px] p-6 shadow-md dark:shadow-black/40 backdrop-blur-xl transition-all space-y-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-500">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Automatizare GPS
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                Pontaj automat la sosirea la muncă
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="bg-gray-100 dark:bg-black/40 p-1 rounded-full flex items-center border border-gray-200/50 dark:border-white/5">
            <button
              onClick={() => onSettingsChange({ ...settings, geofencingEnabled: false })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                !settings.geofencingEnabled
                  ? 'bg-white text-gray-900 shadow-md scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              OFF
            </button>
            <button
              onClick={() => onSettingsChange({ ...settings, geofencingEnabled: true })}
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
          initialLat={tempCoordinates.lat}
          initialLng={tempCoordinates.lng}
          radius={settings.geofenceRadius || 400}
          onConfirm={handleMapConfirm}
          onCancel={handleMapCancel}
        />
      )}
    </div>
  );
};