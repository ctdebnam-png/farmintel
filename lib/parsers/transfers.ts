import { parse } from 'csv-parse/sync';
import { resolveMapping, DEFAULT_TRANSFER_MAPPING, ColumnMapping } from './column-mapping';

export interface ParsedTransfer {
  parcel_id: string | null;
  sale_date: string | null;
  sale_price: number | null;
  deed_type: string | null;
  recorded_date: string | null;
  raw_record: Record<string, string>;
}

function parseDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (!cleaned) return null;
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso.toISOString().split('T')[0];
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

function trimOrNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed || null;
}

export async function parseTransfersCSV(
  csv: string,
  customMapping?: ColumnMapping
): Promise<ParsedTransfer[]> {
  const records: string[][] = parse(csv, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length < 2) return [];

  const headers = records[0];
  const mapping = resolveMapping(headers, customMapping || DEFAULT_TRANSFER_MAPPING);

  const get = (row: string[], field: string): string | null => {
    const idx = mapping[field];
    if (idx === undefined) return null;
    return row[idx] ?? null;
  };

  const results: ParsedTransfer[] = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (row[idx]) raw[h] = row[idx];
    });

    results.push({
      parcel_id: trimOrNull(get(row, 'parcel_id')),
      sale_date: parseDate(get(row, 'sale_date')),
      sale_price: parseNumber(get(row, 'sale_price')),
      deed_type: trimOrNull(get(row, 'deed_type')),
      recorded_date: parseDate(get(row, 'recorded_date')),
      raw_record: raw,
    });
  }

  return results;
}
