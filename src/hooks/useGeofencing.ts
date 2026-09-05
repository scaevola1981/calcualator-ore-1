import { useEffect, useState, useRef, useCallback } from 'react';

export interface GeofenceConfig {
    latitude: number;
    longitude: number;
    radius: number; // meters
    enabled: boolean;
}

interface GeofencingState {
    isInZone: boolean;
    currentDistance: number | null;
    lastPosition: { lat: number; lng: number } | null;
    error: string | null;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(
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
) => {
    const [state, setState] = useState<GeofencingState>({
        isInZone: false,
        currentDistance: null,
        lastPosition: null,
        error: null,
    });

    const watchIdRef = useRef<string | null>(null);
    const lastKnownZoneState = useRef(false);

    // Refs for callbacks to avoid re-subscribing when they change
    const onEnterZoneRef = useRef(onEnterZone);
    const onExitZoneRef = useRef(onExitZone);

    // Permanent denial flag to prevent spam
    const permissionDeniedRef = useRef(false);

    // Update refs on every render
    useEffect(() => {
        onEnterZoneRef.current = onEnterZone;
        onExitZoneRef.current = onExitZone;
    }, [onEnterZone, onExitZone]);

    const checkPosition = useCallback(
        (position: GeolocationPosition) => {
            if (!position?.coords) return;

            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            // Calculate distance from geofence center
            const distance = calculateDistance(
                config.latitude,
                config.longitude,
                currentLat,
                currentLng
            );

            // Debounce log or reduce spam? For now, we keep it but it might be verbose.
            // console.log('[Agent ZONA] Distance:', Math.round(distance), 'm');

            const wasInZone = lastKnownZoneState.current;
            const isNowInZone = distance <= config.radius;

            setState({
                isInZone: isNowInZone,
                currentDistance: Math.round(distance),
                lastPosition: { lat: currentLat, lng: currentLng },
                error: null,
            });

            // Trigger callbacks on zone transitions using refs
            if (!wasInZone && isNowInZone) {
                console.log('[Agent ZONA] → Intrare în zonă');
                onEnterZoneRef.current?.();
            } else if (wasInZone && !isNowInZone) {
                console.log('[Agent ZONA] ← Ieșire din zonă');
                onExitZoneRef.current?.();
            }

            lastKnownZoneState.current = isNowInZone;
        },
        [config.latitude, config.longitude, config.radius]
    );

    useEffect(() => {
        // Stop if not enabled
        if (!config.enabled) {
            if (watchIdRef.current) {
                const numericId = parseInt(watchIdRef.current, 10);
                if (!isNaN(numericId)) navigator.geolocation.clearWatch(numericId);
                watchIdRef.current = null;
            }
            setState({ isInZone: false, currentDistance: null, lastPosition: null, error: null });
            return;
        }

        // Stop if permission was previously denied
        if (permissionDeniedRef.current) {
            console.warn('[Agent ZONA] Monitorizare oprită permanent (Permisiune refuzată anterior).');
            return;
        }

        // Validate coordinates
        if (!config.latitude || !config.longitude) {
            setState(s => ({ ...s, error: 'Coordonate invalide' }));
            return;
        }

        const startWatching = async () => {
            if (!navigator.geolocation) {
                setState(s => ({ ...s, error: 'Geolocația nu este suportată' }));
                return;
            }

            console.log('[Agent ZONA] Inițializare monitorizare GPS...');

            // Clear existing
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(parseInt(watchIdRef.current, 10));
                watchIdRef.current = null;
            }

            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    checkPosition(position);
                },
                (err) => {
                    // Handle specific errors
                    if (err.code === 1) { // PERMISSION_DENIED
                        console.error('[Agent ZONA] Permisiune refuzată! Oprire monitorizare.');
                        permissionDeniedRef.current = true;

                        // Clear watch immediately
                        if (watchIdRef.current) {
                            navigator.geolocation.clearWatch(parseInt(watchIdRef.current, 10));
                            watchIdRef.current = null;
                        }

                        setState(s => ({ ...s, error: 'Acces locație refuzat. Activează GPS din setări.' }));
                        return;
                    }

                    console.error('[Agent ZONA] Eroare locație:', err.message);
                    // For other errors (timeout, unavailable), we might keep trying or show error
                    setState(s => ({ ...s, error: `Eroare GPS: ${err.message}` }));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 5000
                }
            );

            watchIdRef.current = watchId.toString();
        };

        startWatching();

        // Cleanup function
        return () => {
            if (watchIdRef.current) {
                const numericId = parseInt(watchIdRef.current, 10);
                if (!isNaN(numericId)) navigator.geolocation.clearWatch(numericId);
                watchIdRef.current = null;
            }
        };
        // Dependencies: Only restart if enabled status, target coordinates, or radius changes.
        // NOT when callbacks change (handled by refs).
    }, [config.enabled, config.latitude, config.longitude, config.radius, checkPosition]);

    return state;
};
