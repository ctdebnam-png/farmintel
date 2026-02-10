import { describe, it, expect } from 'vitest';
import { parseParcelsCSV } from '../../lib/parsers/parcels';
import fs from 'fs';
import path from 'path';

describe('parseParcelsCSV', () => {
  it('should parse the sample parcels CSV', async () => {
    const csv = fs.readFileSync(
      path.join(__dirname, '../../sample-data/parcels.csv'),
      'utf-8'
    );
    const parcels = await parseParcelsCSV(csv);

    expect(parcels).toHaveLength(20);
    expect(parcels[0].parcel_id).toBe('P001');
    expect(parcels[0].situs_address).toBe('100 Oak St');
    expect(parcels[0].city).toBe('Columbus');
    expect(parcels[0].state).toBe('OH');
    expect(parcels[0].zip).toBe('43201');
    expect(parcels[0].owner_name).toBe('Alice Johnson');
    expect(parcels[0].year_built).toBe(1985);
    expect(parcels[0].assessed_value).toBe(185000);
    expect(parcels[0].lat).toBe(39.983);
    expect(parcels[0].lon).toBe(-83.001);
  });

  it('should parse dates in MM/DD/YYYY format', async () => {
    const csv = `parcel_id,last_sale_date
P001,06/15/2012
P002,2018-11-10`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].last_sale_date).toBe('2012-06-15');
    expect(parcels[1].last_sale_date).toBe('2018-11-10');
  });

  it('should parse dollar amounts with $ and commas', async () => {
    const csv = `parcel_id,last_sale_price,assessed_value
P001,"$210,000","$185,000"
P002,175000,165000`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].last_sale_price).toBe(210000);
    expect(parcels[0].assessed_value).toBe(185000);
    expect(parcels[1].last_sale_price).toBe(175000);
  });

  it('should handle missing columns gracefully', async () => {
    const csv = `parcel_id,owner_name
P001,Alice Johnson`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].parcel_id).toBe('P001');
    expect(parcels[0].owner_name).toBe('Alice Johnson');
    expect(parcels[0].situs_address).toBeNull();
    expect(parcels[0].lat).toBeNull();
  });

  it('should preserve raw_record', async () => {
    const csv = `parcel_id,custom_field,owner_name
P001,custom_value,Alice`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].raw_record).toHaveProperty('custom_field', 'custom_value');
  });

  it('should handle alternative column names', async () => {
    const csv = `PIN,property_address,LATITUDE,LONGITUDE
P001,100 Oak St,39.983,-83.001`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].parcel_id).toBe('P001');
    expect(parcels[0].situs_address).toBe('100 Oak St');
    expect(parcels[0].lat).toBe(39.983);
    expect(parcels[0].lon).toBe(-83.001);
  });

  it('should set zone_id_manual from zone_id column', async () => {
    const csv = `parcel_id,zone_id,owner_name
P001,BG-001,Alice`;
    const parcels = await parseParcelsCSV(csv);

    expect(parcels[0].zone_id_manual).toBe('BG-001');
  });
});
