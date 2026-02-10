import { parse } from 'csv-parse/sync';
import { resolveMapping, DEFAULT_PARCEL_MAPPING, ColumnMapping } from './column-mapping';

export interface ParsedParcel {
  parcel_id: string | null;
  situs_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  owner_name: string | null;
  mailing_address: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  land_use: string | null;
  year_built: number | null;
  assessed_value: number | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  lat: number | null;
  lon: number | null;
  zone_id_manual: string | null;
  raw_record: Record<string, string>;
}

function parseDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  // Try ISO
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0];
  // Try MM/DD/YYYY
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  return null;
}

function parseNumber(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,\s]/g, '').trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseIntSafe(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[,\s]/g, '').trim();
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function trimOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed || null;
}

export async function parseParcelsCSV(
  csv: string,
  customMapping?: ColumnMapping
): Promise<ParsedParcel[]> {
  const records: string[][] = parse(csv, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length < 2) return [];

  const headers = records[0];
  const mapping = resolveMapping(headers, customMapping || DEFAULT_PARCEL_MAPPING);

  const get = (row: string[], field: string): string | null => {
    const idx = mapping[field];
    if (idx === undefined) return null;
    return row[idx] ?? null;
  };

  const results: ParsedParcel[] = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    // Build raw record
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (row[idx]) raw[h] = row[idx];
    });

    results.push({
      parcel_id: trimOrNull(get(row, 'parcel_id')),
      situs_address: trimOrNull(get(row, 'situs_address')),
      city: trimOrNull(get(row, 'city')),
      state: trimOrNull(get(row, 'state')),
      zip: trimOrNull(get(row, 'zip')),
      owner_name: trimOrNull(get(row, 'owner_name')),
      mailing_address: trimOrNull(get(row, 'mailing_address')),
      mailing_city: trimOrNull(get(row, 'mailing_city')),
      mailing_state: trimOrNull(get(row, 'mailing_state')),
      mailing_zip: trimOrNull(get(row, 'mailing_zip')),
      land_use: trimOrNull(get(row, 'land_use')),
      year_built: parseIntSafe(get(row, 'year_built')),
      assessed_value: parseNumber(get(row, 'assessed_value')),
      last_sale_date: parseDate(get(row, 'last_sale_date')),
      last_sale_price: parseNumber(get(row, 'last_sale_price')),
      lat: parseNumber(get(row, 'lat')),
      lon: parseNumber(get(row, 'lon')),
      zone_id_manual: trimOrNull(get(row, 'zone_id_manual')),
      raw_record: raw,
    });
  }

  return results;
}
