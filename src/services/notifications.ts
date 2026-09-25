import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Create notification channels for Android
// Android 8+ requires separate channels. 
// We create separate channels for Entry/Exit so they can have distinct system behaviors/groups if needed.
// Currently configured to use DEFAULT system sound to ensure audio plays.
export const createNotificationChannels = async () => {
    // Platform Guard: Skip on Web
    if (Capacitor.getPlatform() === 'web') return;

    try {
        // Channel 1: Entry
        await LocalNotifications.createChannel({
            id: 'pontaj_entry',
            name: 'Pontaj - Intrare',
            description: 'Notificări la începerea programului',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#007AFF',
            // Omit 'sound' to use system default notification sound
        });

        // Channel 2: Exit
        await LocalNotifications.createChannel({
            id: 'pontaj_exit',
            name: 'Pontaj - Ieșire',
            description: 'Notificări la terminarea programului',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#FF3B30',
            // Omit 'sound' to use system default notification sound
        });

        console.log('[Notificări] Canale "pontaj_entry" și "pontaj_exit" create (Sunet Default)');
    } catch (error) {
        console.error('[Notificări] Eroare la crearea canalelor:', error);
    }
};

// Initialize notifications and request permissions
export const initializeNotifications = async (): Promise<boolean> => {
    // Platform Guard: Skip on Web
    if (Capacitor.getPlatform() === 'web') return false;

    try {
        // Create channels first (Android only)
        await createNotificationChannels();

        // Check if we have permission
        const permStatus = await LocalNotifications.checkPermissions();

        if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
            // Request permission
            const result = await LocalNotifications.requestPermissions();
            return result.display === 'granted';
        }

        return permStatus.display === 'granted';
    } catch (error) {
        console.error('[Notificări] Eroare la inițializare:', error);
        return false;
    }
};

// Send notification on zone entry
export const notifyZoneEntry = async (userName: string) => {
    if (Capacitor.getPlatform() === 'web') return;
    try {
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: 1,
                    title: '🟢 Agent ZONA - Pontaj Pornit!',
                    body: `Salut, ${userName}! Agentul ZONA a pornit cronometrul. Spor la muncă! 💪`,
                    schedule: { at: new Date(Date.now() + 100) },
                    channelId: 'pontaj_entry',
                    // Use system default sound if enabled, nothing if disabled (requires logic but LocalNotifications acts weird with 'undefined' sound sometimes, best is rely on channel)
                    // If soundEnabled is false, we technically need a silent channel. 
                    // For now, let's assume relying on system volume.
                    // sound: soundEnabled ? undefined : undefined, 
                    smallIcon: 'ic_launcher', // Use app icon
                    largeIcon: 'ic_launcher',
                    iconColor: '#007AFF', // Blue
                    actionTypeId: '',
                    extra: {
                        type: 'zone_entry'
                    }
                },
            ],
        });
        console.log('[Notificări] Notificare intrare trimisă');
    } catch (error) {
        console.error('[Notificări] Eroare la trimitere notificare intrare:', error);
    }
};

// Format duration
const formatDuration = (startTime: Date, endTime: Date): string => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes} minute`;
    else if (minutes === 0) return `${hours} ore`;
    else return `${hours} ore și ${minutes} minute`;
};

// Send notification on zone exit
export const notifyZoneExit = async (userName: string, startTime?: Date) => {
    if (Capacitor.getPlatform() === 'web') return;
    try {
        let timeWorked = '';
        if (startTime) {
            timeWorked = ` Ai lucrat ${formatDuration(startTime, new Date())}.`;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: 2,
                    title: '🔴 Agent ZONA - Zi Încheiată!',
                    body: `Bravo, ${userName}!${timeWorked} Datele au fost salvate. Odihnă plăcută! ☕`,
                    schedule: { at: new Date(Date.now() + 100) },
                    channelId: 'pontaj_exit',
                    smallIcon: 'ic_launcher',
                    largeIcon: 'ic_launcher',
                    iconColor: '#FF3B30', // Red
                    extra: {
                        type: 'zone_exit'
                    }
                },
            ],
        });
        console.log('[Notificări] Notificare ieșire trimisă');
    } catch (error) {
        console.error('[Notificări] Eroare la trimitere notificare ieșire:', error);
    }
};

// Cancel all
export const cancelAllNotifications = async () => {
    if (Capacitor.getPlatform() === 'web') return;
    try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }, { id: 10 }, { id: 11 }] });
    } catch (error) {
        console.error('[Notificări] Eroare la anulare notificări:', error);
    }
};

let webTimer8h: ReturnType<typeof setTimeout> | null = null;
let webTimer12h: ReturnType<typeof setTimeout> | null = null;

/**
 * Programare Alerte Inteligente la 8 ore și 12 ore
 */
export const scheduleShiftAlerts = async (userName: string, startTime: Date) => {
    const now = Date.now();
    const startMs = new Date(startTime).getTime();
    const alert8hTime = new Date(startMs + 8 * 60 * 60 * 1000);
    const alert12hTime = new Date(startMs + 12 * 60 * 60 * 1000);

    // Capacitor Native (Android / iOS)
    if (Capacitor.getPlatform() !== 'web') {
        try {
            const notificationsToSchedule = [];

            if (alert8hTime.getTime() > now) {
                notificationsToSchedule.push({
                    id: 10,
                    title: '⏱️ Norma de 8 Ore A Fost Atinsă!',
                    body: `Salut, ${userName}! Ai terminat norma de 8 ore. De acum începe contorizarea orelor suplimentare (cu pauza de 30m scăzută).`,
                    schedule: { at: alert8hTime },
                    channelId: 'pontaj_entry',
                    smallIcon: 'ic_launcher',
                    largeIcon: 'ic_launcher',
                    iconColor: '#007AFF',
                });
            }

            if (alert12hTime.getTime() > now) {
                notificationsToSchedule.push({
                    id: 11,
                    title: '⚠️ Verificare: 12 Ore Lucrate!',
                    body: `Atenție, ${userName}! Pontajul rulează de 12 ore. Nu uita să oprești pontajul dacă ai terminat programul de lucru!`,
                    schedule: { at: alert12hTime },
                    channelId: 'pontaj_exit',
                    smallIcon: 'ic_launcher',
                    largeIcon: 'ic_launcher',
                    iconColor: '#FF9500',
                });
            }

            if (notificationsToSchedule.length > 0) {
                await LocalNotifications.schedule({ notifications: notificationsToSchedule });
                console.log('[Notificări] Alerte inteligente 8h/12h programate pe telefon');
            }
        } catch (error) {
            console.error('[Notificări] Eroare la programarea alertelor de tură:', error);
        }
    } else {
        // Web / Browser support
        cancelShiftAlerts();
        const msUntil8h = alert8hTime.getTime() - now;
        if (msUntil8h > 0) {
            webTimer8h = setTimeout(() => {
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('⏱️ Norma de 8 Ore A Fost Atinsă!', {
                        body: `Salut, ${userName}! Ai terminat norma de 8 ore. Orele suplimentare sunt contorizate automat.`,
                    });
                }
            }, msUntil8h);
        }

        const msUntil12h = alert12hTime.getTime() - now;
        if (msUntil12h > 0) {
            webTimer12h = setTimeout(() => {
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('⚠️ Verificare: 12 Ore Lucrate!', {
                        body: `Atenție, ${userName}! Pontajul rulează de 12 ore. Ai oprit pontajul?`,
                    });
                }
            }, msUntil12h);
        }
    }
};

/**
 * Anulare Alerte Inteligente la oprirea pontajului
 */
export const cancelShiftAlerts = async () => {
    if (webTimer8h) {
        clearTimeout(webTimer8h);
        webTimer8h = null;
    }
    if (webTimer12h) {
        clearTimeout(webTimer12h);
        webTimer12h = null;
    }

    if (Capacitor.getPlatform() !== 'web') {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 10 }, { id: 11 }] });
            console.log('[Notificări] Alerte inteligente de tură anulate');
        } catch (err) {
            console.warn('[Notificări] Eroare la anularea alertelor de tură:', err);
        }
    }
};

