import type { WorkSession, AppSettings } from '../types';

export interface BackupData {
  version: string;
  appName: string;
  exportedAt: string;
  sessionsCount: number;
  workSessions: {
    id?: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
  }[];
  settings: AppSettings;
}

/**
 * Generates and triggers download of a JSON backup file
 */
export const exportBackupToFile = (workSessions: WorkSession[], settings: AppSettings): void => {
  const backup: BackupData = {
    version: '6.3.0',
    appName: 'Contor Ore Munca - Pontaj Automat',
    exportedAt: new Date().toISOString(),
    sessionsCount: workSessions.length,
    workSessions: workSessions.map(s => ({
      id: s.id,
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
    })),
    settings: { ...settings },
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `backup_pontaj_${settings.userName ? settings.userName.replace(/\s+/g, '_') : 'dorobantu'}_${dateFormatted}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ImportResult {
  success: boolean;
  sessions?: WorkSession[];
  settings?: AppSettings;
  message: string;
  importedCount?: number;
}

/**
 * Validates and parses a JSON backup file content
 */
export const parseBackupData = (
  jsonString: string,
  existingSessions: WorkSession[],
  mode: 'replace' | 'merge' = 'replace'
): ImportResult => {
  try {
    const data = JSON.parse(jsonString);

    if (!data || (typeof data !== 'object')) {
      return { success: false, message: 'Fișierul nu conține un format JSON valid.' };
    }

    // Extract sessions
    const rawSessions: unknown[] = Array.isArray(data.workSessions) ? data.workSessions : (Array.isArray(data) ? data : []);

    const parsedSessions: WorkSession[] = [];
    for (const item of rawSessions) {
      if (item && typeof item === 'object' && 'startTime' in item && 'endTime' in item) {
        const anyItem = item as { id?: string; startTime: string | number; endTime: string | number };
        const sTime = new Date(anyItem.startTime);
        const eTime = new Date(anyItem.endTime);
        if (!isNaN(sTime.getTime()) && !isNaN(eTime.getTime())) {
          parsedSessions.push({
            id: anyItem.id || String(sTime.getTime()),
            startTime: sTime,
            endTime: eTime,
          });
        }
      }
    }

    let finalSessions: WorkSession[] = [];
    if (mode === 'replace') {
      finalSessions = parsedSessions;
    } else {
      // Merge: avoid duplicating exact same session intervals
      const existingTimestamps = new Set(
        existingSessions.map(s => `${new Date(s.startTime).getTime()}-${new Date(s.endTime).getTime()}`)
      );
      finalSessions = [...existingSessions];
      for (const s of parsedSessions) {
        const key = `${s.startTime.getTime()}-${s.endTime.getTime()}`;
        if (!existingTimestamps.has(key)) {
          finalSessions.push(s);
          existingTimestamps.add(key);
        }
      }
    }

    // Sort by startTime descending
    finalSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const importedSettings = (data.settings && typeof data.settings === 'object') ? (data.settings as AppSettings) : undefined;

    return {
      success: true,
      sessions: finalSessions,
      settings: importedSettings,
      importedCount: parsedSessions.length,
      message: `Restaurare reușită: ${parsedSessions.length} sesiuni identificate în backup.`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Eroare la procesarea fișierului: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
