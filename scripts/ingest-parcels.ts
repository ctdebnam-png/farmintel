/**
 * CLI script: npm run ingest:parcels -- --run-id <uuid> --file <path>
 *
 * Parses a parcels CSV and inserts into the database.
 */
import { Pool } from 'pg';
import fs from 'fs';
import { parseParcelsCSV } from '../lib/parsers/parcels';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');
  const fileIdx = args.indexOf('--file');

  if (runIdIdx === -1 || fileIdx === -1) {
    console.error('Usage: npm run ingest:parcels -- --run-id <uuid> --file <path>');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const filePath = args[fileIdx + 1];

  const csv = fs.readFileSync(filePath, 'utf-8');
  const parcels = await parseParcelsCSV(csv);

  console.log(`Parsed ${parcels.length} parcels. Inserting...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of parcels) {
      await client.query(
        `INSERT INTO parcels (run_id, parcel_id, situs_address, city, state, zip,
          owner_name, mailing_address, mailing_city, mailing_state, mailing_zip,
          land_use, year_built, assessed_value, last_sale_date, last_sale_price,
          lat, lon, zone_id_manual, raw_record)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          runId, p.parcel_id, p.situs_address, p.city, p.state, p.zip,
          p.owner_name, p.mailing_address, p.mailing_city, p.mailing_state, p.mailing_zip,
          p.land_use, p.year_built, p.assessed_value, p.last_sale_date, p.last_sale_price,
          p.lat, p.lon, p.zone_id_manual, JSON.stringify(p.raw_record),
        ]
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${parcels.length} parcels for run ${runId}.`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Insert failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
