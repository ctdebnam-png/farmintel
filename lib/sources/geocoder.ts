/**
 * Free geocoding via OpenStreetMap Nominatim.
 *
 * Usage policy: max 1 request/second, include a contact email in User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * For bulk geocoding, this processes addresses sequentially with rate limiting.
 * Good for enriching a few hundred parcels. For thousands, consider a bulk
 * geocoding service.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'FarmIntel/0.1 (internal-tool)';
const RATE_LIMIT_MS = 1100; // Just over 1 second per request

export interface GeocodingResult {
  address: string;
  lat: number;
  lon: number;
  display_name: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Geocode a single address.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodingResult | null> {
  const parts = [address, city, state, zip].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    q: parts,
    format: 'json',
    limit: '1',
    countrycodes: 'us',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) return null;

  const results = await res.json();
  if (!results || results.length === 0) return null;

  const r = results[0];
  const importance = parseFloat(r.importance || '0');

  return {
    address: parts,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display_name: r.display_name,
    confidence: importance > 0.6 ? 'high' : importance > 0.3 ? 'medium' : 'low',
  };
}

/**
 * Batch geocode addresses with rate limiting.
 * Returns a map of index → result (null if geocoding failed).
 *
 * Calls the progress callback after each address so the UI can show status.
 */
export async function batchGeocode(
  addresses: Array<{
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, GeocodingResult | null>> {
  const results = new Map<number, GeocodingResult | null>();

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    try {
      const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip);
      results.set(i, result);
    } catch {
      results.set(i, null);
    }

    if (onProgress) onProgress(i + 1, addresses.length);

    // Rate limit: wait before next request
    if (i < addresses.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
