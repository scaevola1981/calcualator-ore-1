import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, Settings, WorkState } from '../types';
import { translations, funnyMessages } from '../translations';
import { calculateSessionEarnings } from '../utils/calculation';

interface WorkContextType extends WorkState {
  startSession: () => void;
  stopSession: () => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  deleteSession: (id: string) => void;
  addSession: (session: Session) => void;
  t: (key: keyof typeof translations.RO) => string;
  getFunnyMessage: () => string;
}

const WorkContext = createContext<WorkContextType | undefined>(undefined);

const STORAGE_KEY = 'contor_ore_data';

const defaultSettings: Settings = {
  hourlyRate: 50,
  currency: 'EUR',
  targetHours: 160,
  userName: 'User',
  language: 'RO',
  theme: 'dark',
  hasNoLimit: false
};

export function WorkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      currentSession: null,
      history: [],
      settings: defaultSettings
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const startSession = () => {
    if (state.currentSession) return;
    setState(prev => ({
      ...prev,
      currentSession: {
        id: crypto.randomUUID(),
        startTime: Date.now()
      }
    }));
  };

  const stopSession = () => {
    const { currentSession, settings } = state;
    if (!currentSession) return;

    const endTime = Date.now();
    const durationHours = (endTime - currentSession.startTime) / (1000 * 60 * 60);
    const earnings = calculateSessionEarnings(durationHours, settings.hourlyRate, settings.hasNoLimit);

    const completedSession: Session = {
      ...currentSession,
      endTime,
      earnings,
      modeFlag: settings.hasNoLimit
    };

    setState(prev => ({
      ...prev,
      currentSession: null,
      history: [completedSession, ...prev.history]
    }));
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  const deleteSession = (id: string) => {
    setState(prev => ({
      ...prev,
      history: prev.history.filter(s => s.id !== id)
    }));
  };

  const addSession = (session: Session) => {
    setState(prev => ({
      ...prev,
      history: [session, ...prev.history]
    }));
  };

  const t = (key: keyof typeof translations.RO) => {
    const lang = state.settings.language;
    return translations[lang][key] || translations['RO'][key];
  };

  const getFunnyMessage = () => {
    const lang = state.settings.language;
    const messages = funnyMessages[lang];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <WorkContext.Provider value={{
      ...state,
      startSession,
      stopSession,
      updateSettings,
      deleteSession,
      addSession,
      t,
      getFunnyMessage
    }}>
      {children}
    </WorkContext.Provider>
  );
}

export function useWork() {
  const context = useContext(WorkContext);
  if (!context) throw new Error('useWork must be used within WorkProvider');
  return context;
}
