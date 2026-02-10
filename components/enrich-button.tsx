'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EnrichButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleEnrich() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/enrich/${runId}`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Enrichment failed');
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

  return (
    <div>
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Fetching data...' : 'Fetch Census + Boundaries'}
      </button>
      <p className="mt-1 text-xs text-gray-400">
        Pulls tract/block group boundaries, demographics, income, housing data from Census Bureau
      </p>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {result && (
        <div className="mt-2 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          <p>Fetched data for {result.county} (FIPS {result.fips})</p>
          <ul className="mt-1 text-xs space-y-0.5">
            <li>{result.boundaries} zone boundaries loaded</li>
            <li>{result.census_zones} zones with Census demographics</li>
            {result.hpi && (
              <li>HPI ({result.hpi.metro}): {result.hpi.latest?.toFixed(1)} (YoY {result.hpi.yoy?.toFixed(1)}%)</li>
            )}
            {result.hpi_skipped && (
              <li className="text-gray-500">{result.hpi_skipped}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
