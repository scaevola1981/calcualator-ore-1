import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import { X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pentru marker-ul Leaflet default
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GeofenceMapModalProps {
    isOpen: boolean;
    currentLat: number;
    currentLng: number;
    initialRadius: number;
    onConfirm: (lat: number, lng: number, radius: number) => void;
    onCancel: () => void;
}

export const GeofenceMapModal: React.FC<GeofenceMapModalProps> = ({
    isOpen,
    currentLat,
    currentLng,
    initialRadius,
    onConfirm,
    onCancel,
}) => {
    const [radius, setRadius] = useState(initialRadius);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(currentLat, currentLng, radius);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            {/* Modal Container - iOS Bottom Sheet Style */}
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            🗺️ Configurează Agent ZONA
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Ajustează raza zonei tale de lucru
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Închide"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Map Container */}
                <div className="p-6 space-y-6 pb-24">
                    <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-700">
                        <MapContainer
                            center={[currentLat, currentLng]}
                            zoom={16}
                            style={{ height: '300px', width: '100%' }}
                            zoomControl={true}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Marker pentru poziția curentă */}
                            <Marker position={[currentLat, currentLng]}>
                                <Popup>
                                    <div className="text-center">
                                        <div className="text-lg font-bold">📍 Tu ești aici!</div>
                                        <div className="text-sm text-gray-600">Poarta ta de lucru</div>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Cerc pentru geofence */}
                            <Circle
                                center={[currentLat, currentLng]}
                                radius={radius}
                                pathOptions={{
                                    color: '#007AFF',
                                    fillColor: '#007AFF',
                                    fillOpacity: 0.15,
                                    weight: 3,
                                }}
                            />
                        </MapContainer>
                    </div>

                    {/* Slider pentru rază */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Rază zonă
                            </label>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {radius}m
                            </span>
                        </div>

                        {/* iOS-style Range Slider */}
                        <div className="relative">
                            <input
                                type="range"
                                min="100"
                                max="1000"
                                step="50"
                                value={radius}
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-600
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-6
                  [&::-moz-range-thumb]:h-6
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-blue-600
                  [&::-moz-range-thumb]:shadow-lg
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:transition-transform
                  [&::-moz-range-thumb]:hover:scale-110"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                                <span>100m</span>
                                <span>1000m</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                💡 <strong>Sfat:</strong> Setează raza astfel încât să includă întreaga zonă unde lucrezi.
                                Pontajul va porni automat când intri în acest cerc.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-4 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            ❌ Anulează
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all active:scale-95"
                        >
                            ✅ Confirmă zonă
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
