/**
 * CLI script: npm run export:csv -- --run-id <uuid> --output <path>
 */
import { Pool } from 'pg';
import fs from 'fs';
import { stringify } from 'csv-stringify/sync';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');
  const outputIdx = args.indexOf('--output');

  if (runIdIdx === -1) {
    console.error('Usage: npm run export:csv -- --run-id <uuid> [--output <path>]');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : `export-${runId.slice(0, 8)}.csv`;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT p.*, z.zone_name, z.score_total
       FROM parcels p
       LEFT JOIN zones z ON z.run_id = p.run_id AND z.zone_id = p.zone_id_manual
       WHERE p.run_id = $1
       ORDER BY z.score_total DESC NULLS LAST, p.owner_name`,
      [runId]
    );

    const rows = result.rows.map((p: any) => ({
      owner_name: p.owner_name || '',
      mailing_address: p.mailing_address || '',
      mailing_city: p.mailing_city || '',
      mailing_state: p.mailing_state || '',
      mailing_zip: p.mailing_zip || '',
      situs_address: p.situs_address || '',
      city: p.city || '',
      state: p.state || '',
      zip: p.zip || '',
      parcel_id: p.parcel_id || '',
      zone: p.zone_name || p.zone_id_manual || '',
      zone_score: p.score_total ?? '',
      segment: p.score_total >= 60 ? 'high_priority' : p.score_total >= 40 ? 'medium_priority' : 'low_priority',
      message_variant: p.score_total >= 60 ? 'A' : p.score_total >= 40 ? 'B' : 'C',
    }));

    const csv = stringify(rows, { header: true });
    fs.writeFileSync(outputPath, csv);
    console.log(`Exported ${rows.length} rows to ${outputPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
