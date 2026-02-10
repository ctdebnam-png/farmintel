/**
 * FRED (Federal Reserve Economic Data) client.
 *
 * Fetches home price indices from the FHFA via FRED's API.
 * Requires a free API key from https://fred.stlouisfed.org/docs/api/api_key.html
 * Set FRED_API_KEY env var.
 *
 * Falls back to national-level HPI if no metro-level data is available.
 */

const BASE_URL = 'https://api.stlouisfed.org/fred';

// FHFA All-Transactions House Price Index by MSA
// Series IDs for common Ohio metros
export const OHIO_HPI_SERIES: Record<string, string> = {
  'columbus': 'ATNHPIUS18140Q',   // Columbus MSA
  'cleveland': 'ATNHPIUS17460Q',  // Cleveland MSA
  'cincinnati': 'ATNHPIUS17140Q', // Cincinnati MSA
  'dayton': 'ATNHPIUS19380Q',     // Dayton MSA
  'akron': 'ATNHPIUS10420Q',      // Akron MSA
  'toledo': 'ATNHPIUS45780Q',     // Toledo MSA
  'youngstown': 'ATNHPIUS49660Q', // Youngstown MSA
  'canton': 'ATNHPIUS15940Q',     // Canton MSA
};

const NATIONAL_HPI_SERIES = 'USSTHPI'; // US All-Transactions HPI

export interface HPIDataPoint {
  date: string;
  value: number;
}

export interface HPISummary {
  series_id: string;
  metro: string;
  latest_value: number;
  latest_date: string;
  year_ago_value: number | null;
  five_year_ago_value: number | null;
  yoy_change_pct: number | null;
  five_year_change_pct: number | null;
  data_points: HPIDataPoint[];
}

/**
 * Fetch House Price Index observations from FRED.
 */
async function fetchFredSeries(
  seriesId: string,
  startDate?: string
): Promise<HPIDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable required. Get one free at https://fred.stlouisfed.org/docs/api/api_key.html');
  }

  const start = startDate || '2015-01-01';
  const url = `${BASE_URL}/series/observations?series_id=${seriesId}&observation_start=${start}&api_key=${apiKey}&file_type=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FRED API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const observations: any[] = json.observations || [];

  return observations
    .filter((o: any) => o.value !== '.')
    .map((o: any) => ({
      date: o.date,
      value: parseFloat(o.value),
    }));
}

/**
 * Fetch HPI summary for a metro area (or national fallback).
 */
export async function fetchHPI(metro?: string): Promise<HPISummary> {
  const metroKey = metro?.toLowerCase().trim();
  const seriesId = (metroKey && OHIO_HPI_SERIES[metroKey]) || NATIONAL_HPI_SERIES;
  const label = metroKey && OHIO_HPI_SERIES[metroKey] ? metroKey : 'National';

  const points = await fetchFredSeries(seriesId, '2015-01-01');
  if (points.length === 0) {
    throw new Error(`No HPI data found for series ${seriesId}`);
  }

  const latest = points[points.length - 1];
  const latestDate = new Date(latest.date);

  // Find year-ago value
  const yearAgoTarget = new Date(latestDate);
  yearAgoTarget.setFullYear(yearAgoTarget.getFullYear() - 1);
  const yearAgo = findClosest(points, yearAgoTarget);

  // Find five-year-ago value
  const fiveYearTarget = new Date(latestDate);
  fiveYearTarget.setFullYear(fiveYearTarget.getFullYear() - 5);
  const fiveYearAgo = findClosest(points, fiveYearTarget);

  return {
    series_id: seriesId,
    metro: label,
    latest_value: latest.value,
    latest_date: latest.date,
    year_ago_value: yearAgo?.value ?? null,
    five_year_ago_value: fiveYearAgo?.value ?? null,
    yoy_change_pct: yearAgo ? ((latest.value - yearAgo.value) / yearAgo.value) * 100 : null,
    five_year_change_pct: fiveYearAgo ? ((latest.value - fiveYearAgo.value) / fiveYearAgo.value) * 100 : null,
    data_points: points.slice(-20), // Last 20 quarters (5 years)
  };
}

function findClosest(points: HPIDataPoint[], target: Date): HPIDataPoint | null {
  let closest: HPIDataPoint | null = null;
  let minDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(new Date(p.date).getTime() - target.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  // Only return if within 6 months
  if (minDiff > 180 * 24 * 60 * 60 * 1000) return null;
  return closest;
}
