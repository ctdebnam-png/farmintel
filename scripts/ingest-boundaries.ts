/**
 * CLI script: npm run ingest:boundaries -- --run-id <uuid> --file <path>
 */
import { Pool } from 'pg';
import fs from 'fs';
import { parseBoundariesGeoJSON } from '../lib/parsers/boundaries';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');
  const fileIdx = args.indexOf('--file');

  if (runIdIdx === -1 || fileIdx === -1) {
    console.error('Usage: npm run ingest:boundaries -- --run-id <uuid> --file <path>');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const filePath = args[fileIdx + 1];

  const geojson = fs.readFileSync(filePath, 'utf-8');
  const boundaries = parseBoundariesGeoJSON(geojson);

  console.log(`Parsed ${boundaries.length} boundaries. Inserting as zones...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const b of boundaries) {
      await client.query(
        `INSERT INTO zones (run_id, zone_id, zone_name, geometry)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [runId, b.zone_id, b.zone_name, JSON.stringify(b.geometry)]
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${boundaries.length} boundary zones for run ${runId}.`);
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
