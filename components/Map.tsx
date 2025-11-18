'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import type { User, Zone } from '@/types';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  currentUser?: User;
  visibleUsers?: User[];
  zones?: Zone[];
}

export default function Map({ 
  center, 
  zoom = 15, 
  currentUser,
  visibleUsers = [],
  zones = []
}: MapProps) {
  const getMarkerIcon = (role: string) => {
    const color = role === 'chaser' ? 'red' : role === 'runner' ? 'blue' : 'green';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {currentUser?.location && (
        <Marker
          position={[currentUser.location.lat, currentUser.location.lng]}
          icon={getMarkerIcon(currentUser.role)}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{currentUser.nickname} (You)</p>
              <p>Role: {currentUser.role}</p>
              <p>Status: {currentUser.status}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {visibleUsers.map((user) => 
        user.location && (
          <Marker
            key={user.id}
            position={[user.location.lat, user.location.lng]}
            icon={getMarkerIcon(user.role)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{user.nickname}</p>
                <p>Role: {user.role}</p>
                <p>Status: {user.status}</p>
                {user.captureCount !== undefined && (
                  <p>Captures: {user.captureCount}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      )}

      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.center.lat, zone.center.lng]}
          radius={zone.radius}
          fillColor={zone.type === 'safe' ? 'green' : 'red'}
          fillOpacity={0.2}
          color={zone.type === 'safe' ? 'green' : 'red'}
          weight={2}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{zone.name}</p>
              <p>Type: {zone.type}</p>
              <p>Radius: {zone.radius}m</p>
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}