/**
 * CLI script: npm run score:zones -- --run-id <uuid>
 *
 * Reads parcels and transfers from the database, runs the scoring engine,
 * and updates zone records.
 */
import { Pool } from 'pg';
import { aggregateAndScore } from '../lib/scoring/engine';
import { ParsedParcel } from '../lib/parsers/parcels';
import { ParsedTransfer } from '../lib/parsers/transfers';
import { ParsedBoundary } from '../lib/parsers/boundaries';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');

  if (runIdIdx === -1) {
    console.error('Usage: npm run score:zones -- --run-id <uuid>');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const client = await pool.connect();

  try {
    // Load run and campaign
    const runResult = await client.query('SELECT * FROM runs WHERE id = $1', [runId]);
    const run = runResult.rows[0];
    if (!run) {
      console.error('Run not found');
      process.exit(1);
    }

    const campResult = await client.query('SELECT * FROM campaigns WHERE id = $1', [run.campaign_id]);
    const campaign = campResult.rows[0];

    // Load parcels
    const parcelResult = await client.query('SELECT * FROM parcels WHERE run_id = $1', [runId]);
    const parcels: ParsedParcel[] = parcelResult.rows.map((r: any) => ({
      parcel_id: r.parcel_id,
      situs_address: r.situs_address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      owner_name: r.owner_name,
      mailing_address: r.mailing_address,
      mailing_city: r.mailing_city,
      mailing_state: r.mailing_state,
      mailing_zip: r.mailing_zip,
      land_use: r.land_use,
      year_built: r.year_built,
      assessed_value: r.assessed_value ? parseFloat(r.assessed_value) : null,
      last_sale_date: r.last_sale_date,
      last_sale_price: r.last_sale_price ? parseFloat(r.last_sale_price) : null,
      lat: r.lat,
      lon: r.lon,
      zone_id_manual: r.zone_id_manual,
      raw_record: r.raw_record || {},
    }));

    // Load transfers
    const transferResult = await client.query('SELECT * FROM transfers WHERE run_id = $1', [runId]);
    const transfers: ParsedTransfer[] = transferResult.rows.map((r: any) => ({
      parcel_id: r.parcel_id,
      sale_date: r.sale_date,
      sale_price: r.sale_price ? parseFloat(r.sale_price) : null,
      deed_type: r.deed_type,
      recorded_date: r.recorded_date,
      raw_record: r.raw_record || {},
    }));

    // Load existing zones (boundaries)
    const zoneResult = await client.query('SELECT * FROM zones WHERE run_id = $1', [runId]);
    const boundaries: ParsedBoundary[] = zoneResult.rows
      .filter((r: any) => r.geometry)
      .map((r: any) => ({
        zone_id: r.zone_id,
        zone_name: r.zone_name,
        geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
        properties: {},
      }));

    console.log(`Scoring: ${parcels.length} parcels, ${transfers.length} transfers, ${boundaries.length} boundaries`);

    const scored = aggregateAndScore(parcels, transfers, boundaries, {
      weightTenure: campaign?.weight_tenure ?? 0.25,
      weightTransferDensity: campaign?.weight_transfer_density ?? 0.20,
      weightOwnerOccupancy: campaign?.weight_owner_occupancy ?? 0.25,
      weightValueBand: campaign?.weight_value_band ?? 0.20,
      penaltyRenter: campaign?.penalty_renter ?? 0.10,
    });

    // Upsert zones
    await client.query('BEGIN');
    await client.query('DELETE FROM zones WHERE run_id = $1', [runId]);
    for (const z of scored) {
      await client.query(
        `INSERT INTO zones (run_id, zone_id, zone_name, geometry, parcel_count, transfer_count_10y, score_total, score_components)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [runId, z.zone_id, z.zone_name, z.geometry ? JSON.stringify(z.geometry) : null,
         z.parcel_count, z.transfer_count_10y, z.score_total, JSON.stringify(z.score_components)]
      );
    }
    await client.query('UPDATE runs SET status = $2, finished_at = NOW() WHERE id = $1', [runId, 'complete']);
    await client.query('COMMIT');

    console.log(`Scored ${scored.length} zones. Top zone: ${scored[0]?.zone_id} (${scored[0]?.score_total})`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Scoring failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
