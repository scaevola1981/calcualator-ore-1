export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  note?: string;
  earnings?: number;
  modeFlag?: boolean;
}

import { Language } from './translations';

export interface Settings {
  hourlyRate: number;
  currency: string;
  hasNoLimit: boolean;
  targetHours: number;
  userName: string;
  language: Language;
  theme: 'dark' | 'light';
}

export interface WorkState {
  currentSession: Session | null;
  history: Session[];
  settings: Settings;
}
