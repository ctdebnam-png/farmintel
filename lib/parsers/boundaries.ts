export interface ParsedBoundary {
  zone_id: string;
  zone_name: string | null;
  geometry: any; // GeoJSON geometry
  properties: Record<string, any>;
}

/**
 * Parse a GeoJSON FeatureCollection into an array of boundaries.
 * Expects standard GeoJSON with features that have a zone/tract/block_group ID
 * in the properties.
 */
export function parseBoundariesGeoJSON(geojsonStr: string): ParsedBoundary[] {
  const geojson = JSON.parse(geojsonStr);

  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection');
  }

  const idFields = [
    'GEOID', 'geoid', 'GEOID20', 'GEOID10',
    'TRACTCE', 'TRACTCE20', 'TRACTCE10',
    'BLKGRPCE', 'BLKGRPCE20',
    'zone_id', 'ZONE_ID', 'id', 'ID',
    'NAME', 'name',
    'NAMELSAD', 'NAMELSAD20',
  ];

  const nameFields = [
    'NAMELSAD', 'NAMELSAD20', 'NAMELSAD10',
    'NAME', 'name', 'zone_name',
  ];

  return geojson.features.map((feature: any, index: number) => {
    const props = feature.properties || {};

    // Find zone ID
    let zoneId: string | null = null;
    for (const f of idFields) {
      if (props[f]) {
        zoneId = String(props[f]);
        break;
      }
    }
    if (!zoneId) zoneId = `zone_${index}`;

    // Find zone name
    let zoneName: string | null = null;
    for (const f of nameFields) {
      if (props[f]) {
        zoneName = String(props[f]);
        break;
      }
    }

    return {
      zone_id: zoneId,
      zone_name: zoneName,
      geometry: feature.geometry,
      properties: props,
    };
  });
}

/**
 * Simple point-in-polygon test for assigning parcels to zones.
 * Uses ray-casting algorithm.
 */
export function pointInPolygon(
  lat: number,
  lon: number,
  polygon: number[][][] // GeoJSON polygon coordinates [ring[point[lng, lat]]]
): boolean {
  // Use the first ring (exterior ring)
  const ring = polygon[0];
  if (!ring) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    // Note: GeoJSON uses [lng, lat] order
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is inside a GeoJSON geometry (Polygon or MultiPolygon).
 */
export function pointInGeometry(lat: number, lon: number, geometry: any): boolean {
  if (!geometry) return false;

  if (geometry.type === 'Polygon') {
    return pointInPolygon(lat, lon, geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly: number[][][]) =>
      pointInPolygon(lat, lon, poly)
    );
  }

  return false;
}
