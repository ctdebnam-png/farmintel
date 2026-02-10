/**
 * CLI script: npm run ingest:transfers -- --run-id <uuid> --file <path>
 */
import { Pool } from 'pg';
import fs from 'fs';
import { parseTransfersCSV } from '../lib/parsers/transfers';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');
  const fileIdx = args.indexOf('--file');

  if (runIdIdx === -1 || fileIdx === -1) {
    console.error('Usage: npm run ingest:transfers -- --run-id <uuid> --file <path>');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const filePath = args[fileIdx + 1];

  const csv = fs.readFileSync(filePath, 'utf-8');
  const transfers = await parseTransfersCSV(csv);

  console.log(`Parsed ${transfers.length} transfers. Inserting...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of transfers) {
      await client.query(
        `INSERT INTO transfers (run_id, parcel_id, sale_date, sale_price, deed_type, recorded_date, raw_record)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [runId, t.parcel_id, t.sale_date, t.sale_price, t.deed_type, t.recorded_date, JSON.stringify(t.raw_record)]
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${transfers.length} transfers for run ${runId}.`);
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
