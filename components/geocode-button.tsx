'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GeocodeButton({
  runId,
  missingCount,
}: {
  runId: string;
  missingCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleGeocode() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/geocode/${runId}?limit=100`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Geocoding failed');
      } else {
        setResult(data);
        router.refresh();
      }
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  if (missingCount === 0) return null;

  return (
    <div>
      <button
        onClick={handleGeocode}
        disabled={loading}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Geocoding...' : `Geocode ${Math.min(missingCount, 100)} Parcels`}
      </button>
      <p className="mt-1 text-xs text-gray-400">
        {missingCount} parcels missing coordinates. Uses free OpenStreetMap geocoding (~1/sec).
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <p>Geocoded {result.geocoded} of {result.total} parcels. {result.remaining} still remaining.</p>
        </div>
      )}
    </div>
  );
}
