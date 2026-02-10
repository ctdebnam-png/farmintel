import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRun } from '@/lib/data/runs';
import { query, execute } from '@/lib/db';
import { geocodeAddress } from '@/lib/sources/geocoder';

/**
 * Geocode parcels in a run that are missing lat/lon.
 * Rate-limited to 1 req/sec (Nominatim policy).
 *
 * Query params:
 *   limit: max parcels to geocode (default 100, max 500)
 */
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

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

  // Find parcels without lat/lon but with an address
  const parcels = await query(
    `SELECT id, situs_address, city, state, zip
     FROM parcels
     WHERE run_id = $1
       AND lat IS NULL
       AND situs_address IS NOT NULL
     LIMIT $2`,
    [params.runId, limit]
  );

  if (parcels.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'All parcels already have coordinates',
      geocoded: 0,
    });
  }

  let geocoded = 0;
  let failed = 0;

  for (const p of parcels) {
    try {
      const result = await geocodeAddress(
        p.situs_address,
        p.city,
        p.state,
        p.zip
      );

      if (result) {
        await execute(
          'UPDATE parcels SET lat = $2, lon = $3 WHERE id = $1',
          [p.id, result.lat, result.lon]
        );
        geocoded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Rate limit: 1 request per second
    if (parcels.indexOf(p) < parcels.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return NextResponse.json({
    success: true,
    total: parcels.length,
    geocoded,
    failed,
    remaining: await query(
      'SELECT COUNT(*)::int as count FROM parcels WHERE run_id = $1 AND lat IS NULL AND situs_address IS NOT NULL',
      [params.runId]
    ).then((r) => r[0]?.count ?? 0),
  });
}
