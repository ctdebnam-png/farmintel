import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRun, updateRunStatus } from '@/lib/data/runs';
import { listUploads } from '@/lib/data/uploads';
import { storage } from '@/lib/storage';
import { parseParcelsCSV } from '@/lib/parsers/parcels';
import { parseTransfersCSV } from '@/lib/parsers/transfers';
import { parseBoundariesGeoJSON } from '@/lib/parsers/boundaries';
import { aggregateAndScore } from '@/lib/scoring/engine';
import { query, execute } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await getRun(params.runId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  try {
    await updateRunStatus(run.id, 'running');

    // Clear previous data for re-runs
    await execute('DELETE FROM parcels WHERE run_id = $1', [run.id]);
    await execute('DELETE FROM transfers WHERE run_id = $1', [run.id]);
    await execute('DELETE FROM zones WHERE run_id = $1', [run.id]);

    const uploads = await listUploads(run.id);

    // 1. Parse parcels
    const parcelUpload = uploads.find((u) => u.kind === 'parcels');
    if (!parcelUpload) {
      await updateRunStatus(run.id, 'error');
      return NextResponse.json({ error: 'No parcels file uploaded' }, { status: 400 });
    }

    const parcelBuffer = await storage.read(parcelUpload.storage_path);
    const parcels = await parseParcelsCSV(parcelBuffer.toString('utf-8'));

    // Insert parcels
    for (const p of parcels) {
      await execute(
        `INSERT INTO parcels (run_id, parcel_id, situs_address, city, state, zip,
          owner_name, mailing_address, mailing_city, mailing_state, mailing_zip,
          land_use, year_built, assessed_value, last_sale_date, last_sale_price,
          lat, lon, zone_id_manual, raw_record)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          run.id, p.parcel_id, p.situs_address, p.city, p.state, p.zip,
          p.owner_name, p.mailing_address, p.mailing_city, p.mailing_state, p.mailing_zip,
          p.land_use, p.year_built, p.assessed_value, p.last_sale_date, p.last_sale_price,
          p.lat, p.lon, p.zone_id_manual, JSON.stringify(p.raw_record),
        ]
      );
    }

    // 2. Parse transfers (optional)
    const transferUpload = uploads.find((u) => u.kind === 'transfers');
    let transfers: any[] = [];
    if (transferUpload) {
      const transferBuffer = await storage.read(transferUpload.storage_path);
      transfers = await parseTransfersCSV(transferBuffer.toString('utf-8'));
      for (const t of transfers) {
        await execute(
          `INSERT INTO transfers (run_id, parcel_id, sale_date, sale_price, deed_type, recorded_date, raw_record)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [run.id, t.parcel_id, t.sale_date, t.sale_price, t.deed_type, t.recorded_date, JSON.stringify(t.raw_record)]
        );
      }
    }

    // 3. Parse boundaries (optional)
    const boundaryUpload = uploads.find((u) => u.kind === 'boundaries');
    let boundaries: any[] = [];
    if (boundaryUpload) {
      const boundaryBuffer = await storage.read(boundaryUpload.storage_path);
      boundaries = parseBoundariesGeoJSON(boundaryBuffer.toString('utf-8'));
    }

    // 4. Get campaign weights
    const campaign = await query(
      'SELECT * FROM campaigns WHERE id = $1',
      [run.campaign_id]
    );
    const weights = campaign[0] || {};

    // 5. Aggregate and score
    const zones = aggregateAndScore(parcels, transfers, boundaries, {
      weightTenure: weights.weight_tenure ?? 0.25,
      weightTransferDensity: weights.weight_transfer_density ?? 0.20,
      weightOwnerOccupancy: weights.weight_owner_occupancy ?? 0.25,
      weightValueBand: weights.weight_value_band ?? 0.20,
      penaltyRenter: weights.penalty_renter ?? 0.10,
    });

    // 6. Insert zones
    for (const z of zones) {
      await execute(
        `INSERT INTO zones (run_id, zone_id, zone_name, geometry, parcel_count,
          transfer_count_10y, score_total, score_components)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          run.id, z.zone_id, z.zone_name, z.geometry ? JSON.stringify(z.geometry) : null,
          z.parcel_count, z.transfer_count_10y, z.score_total, JSON.stringify(z.score_components),
        ]
      );
    }

    // Also update parcel zone_id_manual if boundaries were used for spatial assignment
    // (This is already handled in aggregateAndScore which sets zone_id on parcels)

    await updateRunStatus(run.id, 'complete');
    return NextResponse.json({ success: true, zones: zones.length, parcels: parcels.length });
  } catch (e: any) {
    console.error('Pipeline error:', e);
    await updateRunStatus(run.id, 'error');
    return NextResponse.json({ error: e.message || 'Pipeline failed' }, { status: 500 });
  }
}
