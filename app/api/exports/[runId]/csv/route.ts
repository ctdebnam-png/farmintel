import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { stringify } from 'csv-stringify/sync';

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const zoneFilter = url.searchParams.get('zone');

  let parcels;
  if (zoneFilter) {
    parcels = await query(
      `SELECT p.*, z.zone_name, z.score_total, z.score_components
       FROM parcels p
       LEFT JOIN zones z ON z.run_id = p.run_id AND z.zone_id = p.zone_id_manual
       WHERE p.run_id = $1 AND (p.zone_id_manual = $2 OR z.id = $2)
       ORDER BY p.owner_name`,
      [params.runId, zoneFilter]
    );
  } else {
    parcels = await query(
      `SELECT p.*, z.zone_name, z.score_total, z.score_components
       FROM parcels p
       LEFT JOIN zones z ON z.run_id = p.run_id AND z.zone_id = p.zone_id_manual
       WHERE p.run_id = $1
       ORDER BY z.score_total DESC NULLS LAST, p.owner_name`,
      [params.runId]
    );
  }

  const rows = parcels.map((p: any) => ({
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
    segment: getSegmentLabel(p.score_total),
    message_variant: getMessageVariant(p.score_total),
  }));

  const csv = stringify(rows, { header: true });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="farmintel-export-${params.runId.slice(0, 8)}.csv"`,
    },
  });
}

function getSegmentLabel(score: number | null): string {
  if (score == null) return 'unscored';
  if (score >= 60) return 'high_priority';
  if (score >= 40) return 'medium_priority';
  return 'low_priority';
}

function getMessageVariant(score: number | null): string {
  if (score == null) return 'general';
  if (score >= 60) return 'A';
  if (score >= 40) return 'B';
  return 'C';
}
