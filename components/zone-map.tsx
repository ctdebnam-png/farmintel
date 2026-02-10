'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface ZoneData {
  id: string;
  zone_id: string;
  zone_name: string | null;
  geometry: any;
  parcel_count: number;
  score_total: number;
  score_components: any;
}

function getColor(score: number, maxScore: number): string {
  if (maxScore === 0) return '#cbd5e1';
  const ratio = score / maxScore;
  if (ratio > 0.75) return '#16a34a';
  if (ratio > 0.5) return '#65a30d';
  if (ratio > 0.25) return '#eab308';
  return '#ef4444';
}

function ZoneMapInner({
  zones,
  runId,
}: {
  zones: ZoneData[];
  runId: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  const zonesWithGeom = zones.filter((z) => z.geometry);
  const maxScore = Math.max(...zones.map((z) => z.score_total), 1);

  // Calculate center from zones
  let center: [number, number] = [39.96, -82.99]; // Default: Columbus OH
  if (zonesWithGeom.length > 0) {
    try {
      const fc = {
        type: 'FeatureCollection' as const,
        features: zonesWithGeom.map((z) => ({
          type: 'Feature' as const,
          geometry: typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry,
          properties: {},
        })),
      };
      // Simple centroid from first feature's first coordinate
      const firstCoords = fc.features[0]?.geometry?.coordinates;
      if (firstCoords) {
        const flat = flattenCoords(firstCoords);
        if (flat.length > 0) {
          const avgLat = flat.reduce((s: number, c: number[]) => s + c[1], 0) / flat.length;
          const avgLng = flat.reduce((s: number, c: number[]) => s + c[0], 0) / flat.length;
          center = [avgLat, avgLng];
        }
      }
    } catch {}
  }

  return (
    <MapContainer
      center={center}
      zoom={11}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zonesWithGeom.map((z) => {
        const geom = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry;
        const components = typeof z.score_components === 'string'
          ? JSON.parse(z.score_components)
          : z.score_components;
        const feature = {
          type: 'Feature' as const,
          geometry: geom,
          properties: { id: z.id, zone_id: z.zone_id },
        };
        return (
          <GeoJSON
            key={z.id}
            data={feature as any}
            style={{
              fillColor: getColor(z.score_total, maxScore),
              weight: 2,
              opacity: 0.8,
              color: '#475569',
              fillOpacity: 0.5,
            }}
            onEachFeature={(feature: any, layer: any) => {
              layer.bindPopup(`
                <div style="min-width:180px">
                  <strong>${z.zone_name || z.zone_id}</strong><br/>
                  Score: ${z.score_total.toFixed(1)}<br/>
                  Parcels: ${z.parcel_count}<br/>
                  <em>${components?.reason || ''}</em><br/>
                  <a href="/app/runs/${runId}/zones/${z.id}" style="color:#0c8de9">View details</a>
                </div>
              `);
            }}
          />
        );
      })}
    </MapContainer>
  );
}

function flattenCoords(coords: any): number[][] {
  if (typeof coords[0] === 'number') return [coords];
  return coords.flatMap((c: any) => flattenCoords(c));
}

export default ZoneMapInner;
