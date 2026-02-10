import { describe, it, expect } from 'vitest';
import { parseTransfersCSV } from '../../lib/parsers/transfers';
import fs from 'fs';
import path from 'path';

describe('parseTransfersCSV', () => {
  it('should parse the sample transfers CSV', async () => {
    const csv = fs.readFileSync(
      path.join(__dirname, '../../sample-data/transfers.csv'),
      'utf-8'
    );
    const transfers = await parseTransfersCSV(csv);

    expect(transfers).toHaveLength(23);
    expect(transfers[0].parcel_id).toBe('P001');
    expect(transfers[0].sale_date).toBe('2012-06-15');
    expect(transfers[0].sale_price).toBe(210000);
    expect(transfers[0].deed_type).toBe('WD');
  });

  it('should handle missing price', async () => {
    const csv = `parcel_id,sale_date,sale_price
P001,01/01/2020,
P002,02/01/2020,$0`;
    const transfers = await parseTransfersCSV(csv);

    expect(transfers[0].sale_price).toBeNull();
    expect(transfers[1].sale_price).toBe(0);
  });

  it('should preserve raw_record', async () => {
    const csv = `parcel_id,sale_date,extra_col
P001,01/01/2020,extra_value`;
    const transfers = await parseTransfersCSV(csv);

    expect(transfers[0].raw_record).toHaveProperty('extra_col', 'extra_value');
  });
});
