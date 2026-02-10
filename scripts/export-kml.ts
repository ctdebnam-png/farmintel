/**
 * CLI script: npm run export:kml -- --run-id <uuid> --output <path>
 */
import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

async function main() {
  const args = process.argv.slice(2);
  const runIdIdx = args.indexOf('--run-id');
  const outputIdx = args.indexOf('--output');

  if (runIdIdx === -1) {
    console.error('Usage: npm run export:kml -- --run-id <uuid> [--output <path>]');
    process.exit(1);
  }

  const runId = args[runIdIdx + 1];
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : `export-${runId.slice(0, 8)}.kml`;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM zones WHERE run_id = $1 ORDER BY score_total DESC',
      [runId]
    );

    const placemarks = result.rows.map((z: any) => {
      const geom = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry;
      const components = typeof z.score_components === 'string' ? JSON.parse(z.score_components) : z.score_components;
      const coords = geomToKML(geom);

      return `
    <Placemark>
      <name>${esc(z.zone_name || z.zone_id)}</name>
      <description>${esc(`Score: ${z.score_total}\nParcels: ${z.parcel_count}\n${components?.reason || ''}`)}</description>
      ${coords}
    </Placemark>`;
    });

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>FarmIntel Zone Export</name>
    ${placemarks.join('\n')}
  </Document>
</kml>`;

    fs.writeFileSync(outputPath, kml);
    console.log(`Exported ${result.rows.length} zones to ${outputPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

function geomToKML(geom: any): string {
  if (!geom) return '';
  if (geom.type === 'Polygon') {
    const ring = geom.coordinates[0].map((c: number[]) => `${c[0]},${c[1]},0`).join(' ');
    return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates.map((poly: number[][][]) => {
      const ring = poly[0].map((c: number[]) => `${c[0]},${c[1]},0`).join(' ');
      return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    });
    return `<MultiGeometry>${polys.join('')}</MultiGeometry>`;
  }
  return '';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
