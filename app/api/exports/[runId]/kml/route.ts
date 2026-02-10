import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

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

  let zones;
  if (zoneFilter) {
    zones = await query(
      'SELECT * FROM zones WHERE run_id = $1 AND (zone_id = $2 OR id::text = $2) ORDER BY score_total DESC',
      [params.runId, zoneFilter]
    );
  } else {
    zones = await query(
      'SELECT * FROM zones WHERE run_id = $1 ORDER BY score_total DESC',
      [params.runId]
    );
  }

  const kml = buildKML(zones);

  return new NextResponse(kml, {
    headers: {
      'Content-Type': 'application/vnd.google-earth.kml+xml',
      'Content-Disposition': `attachment; filename="farmintel-zones-${params.runId.slice(0, 8)}.kml"`,
    },
  });
}

function buildKML(zones: any[]): string {
  const placemarks = zones.map((z) => {
    const geom = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry;
    const components = typeof z.score_components === 'string' ? JSON.parse(z.score_components) : z.score_components;
    const coords = geomToKMLCoords(geom);

    return `
    <Placemark>
      <name>${escapeXml(z.zone_name || z.zone_id)}</name>
      <description>${escapeXml(`Score: ${z.score_total}\nParcels: ${z.parcel_count}\n${components?.reason || ''}`)}</description>
      <Style>
        <PolyStyle>
          <color>${scoreToKMLColor(z.score_total, 80)}</color>
          <outline>1</outline>
        </PolyStyle>
        <LineStyle>
          <color>ff333333</color>
          <width>2</width>
        </LineStyle>
      </Style>
      ${coords}
    </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FarmIntel Zone Export</name>
    <description>Area farming zone analysis</description>
    ${placemarks.join('\n')}
  </Document>
</kml>`;
}

function geomToKMLCoords(geom: any): string {
  if (!geom) return '';

  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0]
      .map((c: number[]) => `${c[0]},${c[1]},0`)
      .join(' ');
    return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  }

  if (geom.type === 'MultiPolygon') {
    const polygons = geom.coordinates.map((poly: number[][][]) => {
      const ring = poly[0]
        .map((c: number[]) => `${c[0]},${c[1]},0`)
        .join(' ');
      return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    });
    return `<MultiGeometry>${polygons.join('')}</MultiGeometry>`;
  }

  return '';
}

function scoreToKMLColor(score: number, maxScore: number): string {
  // KML uses AABBGGRR format
  const ratio = maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
  const r = Math.round(255 * (1 - ratio));
  const g = Math.round(255 * ratio);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `88${hex(0)}${hex(g)}${hex(r)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
