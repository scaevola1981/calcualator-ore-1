import { useEffect, useState, useRef, useCallback } from 'react';
import { Geolocation, Position, CallbackID } from '@capacitor/geolocation';

export interface GeofenceConfig {
    latitude: number;
    longitude: number;
    radius: number; // meters
    enabled: boolean;
}

export interface GeofencingState {
    isInZone: boolean;
    currentDistance: number | null;
    accuracy: number | null;
    lastPosition: { lat: number; lng: number } | null;
    status: 'idle' | 'tracking' | 'error';
    error: string | null;
    refreshPosition: () => Promise<void>;
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export const useGeofencing = (
    config: GeofenceConfig,
    onEnterZone?: () => void,
    onExitZone?: () => void
): GeofencingState => {
    const [state, setState] = useState<{
        isInZone: boolean;
        currentDistance: number | null;
        accuracy: number | null;
        lastPosition: { lat: number; lng: number } | null;
        status: 'idle' | 'tracking' | 'error';
        error: string | null;
    }>({
        isInZone: false,
        currentDistance: null,
        accuracy: null,
        lastPosition: null,
        status: 'idle',
        error: null,
    });

    const watchIdRef = useRef<CallbackID | null>(null);
    const intervalIdRef = useRef<any>(null);
    const lastKnownZoneState = useRef<boolean | null>(null);

    // Refs for latest callbacks to prevent stale closures
    const onEnterZoneRef = useRef(onEnterZone);
    const onExitZoneRef = useRef(onExitZone);
    const configRef = useRef(config);

    useEffect(() => {
        onEnterZoneRef.current = onEnterZone;
        onExitZoneRef.current = onExitZone;
        configRef.current = config;
    }, [onEnterZone, onExitZone, config]);

    // Handle a new position reading
    const handleNewPosition = useCallback((position: Position | GeolocationPosition) => {
        if (!position?.coords) return;

        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const accuracy = position.coords.accuracy ?? null;
        const targetLat = configRef.current.latitude;
        const targetLng = configRef.current.longitude;
        const targetRadius = configRef.current.radius || 400;

        if (!targetLat || !targetLng) return;

        const distance = calculateDistance(
            targetLat,
            targetLng,
            currentLat,
            currentLng
        );

        const roundedDistance = Math.round(distance);
        const isNowInZone = distance <= targetRadius;
        const previousZoneState = lastKnownZoneState.current;

        console.log(`[Agent ZONA GPS] Distanță: ${roundedDistance}m (Rază: ${targetRadius}m, Acuratețe: ${accuracy ? Math.round(accuracy) : '?'}m, În zonă: ${isNowInZone})`);

        setState(prev => ({
            ...prev,
            isInZone: isNowInZone,
            currentDistance: roundedDistance,
            accuracy: accuracy ? Math.round(accuracy) : null,
            lastPosition: { lat: currentLat, lng: currentLng },
            status: 'tracking',
            error: null,
        }));

        // Transition logic:
        if (previousZoneState === null) {
            // First time receiving position
            lastKnownZoneState.current = isNowInZone;
            if (isNowInZone) {
                console.log('[Agent ZONA GPS] 🟢 Detectat inițial în zonă -> Pornire pontaj');
                onEnterZoneRef.current?.();
            }
        } else if (!previousZoneState && isNowInZone) {
            // Transition: Outside -> Inside
            console.log('[Agent ZONA GPS] 🟢 Intrare în zonă de lucru -> Pornire pontaj');
            lastKnownZoneState.current = true;
            onEnterZoneRef.current?.();
        } else if (previousZoneState && !isNowInZone) {
            // Transition: Inside -> Outside
            console.log('[Agent ZONA GPS] 🔴 Ieșire din zonă de lucru -> Oprire pontaj');
            lastKnownZoneState.current = false;
            onExitZoneRef.current?.();
        }
    }, []);

    // Manual or programmatic position refresh
    const refreshPosition = useCallback(async () => {
        if (!configRef.current.enabled || !configRef.current.latitude || !configRef.current.longitude) return;

        try {
            const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 3000,
            });
            handleNewPosition(pos);
        } catch (err: any) {
            console.warn('[Agent ZONA GPS] Refresh getCurrentPosition eroare:', err);
            // Fallback to browser geolocation if Capacitor fails
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (p) => handleNewPosition(p),
                    (e) => console.warn('[Agent ZONA GPS] Fallback browser eroare:', e.message),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
                );
            }
        }
    }, [handleNewPosition]);

    useEffect(() => {
        let isMounted = true;

        const clearCurrentWatchers = async () => {
            if (watchIdRef.current) {
                try {
                    await Geolocation.clearWatch({ id: watchIdRef.current });
                } catch (e) {
                    // Ignore clearWatch errors
                }
                watchIdRef.current = null;
            }
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
        };

        // If not enabled or no coordinates, clean up and return
        if (!config.enabled || !config.latitude || !config.longitude) {
            clearCurrentWatchers();
            setState(s => ({
                ...s,
                status: 'idle',
                currentDistance: null,
                isInZone: false,
                error: !config.enabled ? null : 'Coordonate punct de lucru lipsă',
            }));
            lastKnownZoneState.current = null;
            return;
        }

        const startLocationTracking = async () => {
            try {
                // 1. Check and request permissions via Capacitor
                try {
                    const perm = await Geolocation.checkPermissions();
                    if (perm.location !== 'granted') {
                        const req = await Geolocation.requestPermissions();
                        if (req.location !== 'granted') {
                            if (isMounted) {
                                setState(s => ({
                                    ...s,
                                    status: 'error',
                                    error: 'Permisiunea de locație este necesară pentru automatizare GPS.',
                                }));
                            }
                            return;
                        }
                    }
                } catch (permErr) {
                    console.warn('[Agent ZONA GPS] Verificare permisiuni:', permErr);
                }

                if (!isMounted) return;

                // 2. Immediate position check
                try {
                    const immediatePos = await Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 3000,
                    });
                    if (isMounted && immediatePos) {
                        handleNewPosition(immediatePos);
                    }
                } catch (err: any) {
                    console.warn('[Agent ZONA GPS] Verificare inițială getCurrentPosition eroare:', err?.message || err);
                }

                if (!isMounted) return;

                // 3. Register continuous watchPosition
                try {
                    const callbackId = await Geolocation.watchPosition(
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 3000,
                        },
                        (pos, err) => {
                            if (!isMounted) return;
                            if (err) {
                                console.warn('[Agent ZONA GPS] watchPosition eroare:', err);
                                return;
                            }
                            if (pos) {
                                handleNewPosition(pos);
                            }
                        }
                    );
                    watchIdRef.current = callbackId;
                } catch (watchErr: any) {
                    console.error('[Agent ZONA GPS] Nu s-a putut iniția watchPosition:', watchErr);
                }

                // 4. Heartbeat interval: active check every 15s to keep location fresh on stationary devices
                intervalIdRef.current = setInterval(() => {
                    if (isMounted && configRef.current.enabled) {
                        refreshPosition();
                    }
                }, 15000);

            } catch (err: any) {
                if (isMounted) {
                    setState(s => ({
                        ...s,
                        status: 'error',
                        error: `Eroare GPS: ${err?.message || 'Eroare la pornire'}`,
                    }));
                }
            }
        };

        startLocationTracking();

        // 5. Visibility change / Focus listener to re-verify location immediately when user opens app
        const handleAppResume = () => {
            if (document.visibilityState === 'visible' && configRef.current.enabled) {
                console.log('[Agent ZONA GPS] Aplicație readusă în prim-plan -> Verificare imediată GPS');
                refreshPosition();
            }
        };

        document.addEventListener('visibilitychange', handleAppResume);
        window.addEventListener('focus', handleAppResume);

        return () => {
            isMounted = false;
            document.removeEventListener('visibilitychange', handleAppResume);
            window.removeEventListener('focus', handleAppResume);
            clearCurrentWatchers();
        };
    }, [config.enabled, config.latitude, config.longitude, config.radius, handleNewPosition, refreshPosition]);

    return {
        ...state,
        refreshPosition,
    };
};
