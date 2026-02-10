/**
 * Census TIGER/Line boundary fetcher.
 *
 * Fetches tract or block group boundary GeoJSON from the Census TIGERweb
 * REST API. This gives us zone polygons without the user needing to upload
 * a boundaries file.
 *
 * https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/
 */

const TIGER_BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';

// Layer IDs in the TIGERweb ACS2022 service
const LAYERS = {
  tract: `${TIGER_BASE}/tigerWMS_ACS2022/MapServer/8`,
  block_group: `${TIGER_BASE}/tigerWMS_ACS2022/MapServer/10`,
};

export interface TigerFeature {
  zone_id: string;
  zone_name: string;
  geometry: any; // GeoJSON geometry
  properties: Record<string, any>;
}

/**
 * Fetch tract boundaries for a county from TIGERweb.
 */
export async function fetchTractBoundaries(
  stateFips: string,
  countyFips: string
): Promise<TigerFeature[]> {
  return fetchBoundaries('tract', stateFips, countyFips);
}

/**
 * Fetch block group boundaries for a county from TIGERweb.
 */
export async function fetchBlockGroupBoundaries(
  stateFips: string,
  countyFips: string
): Promise<TigerFeature[]> {
  return fetchBoundaries('block_group', stateFips, countyFips);
}

async function fetchBoundaries(
  level: 'tract' | 'block_group',
  stateFips: string,
  countyFips: string
): Promise<TigerFeature[]> {
  const layerUrl = LAYERS[level];

  // Query by state + county FIPS
  const where = `STATE='${stateFips}' AND COUNTY='${countyFips}'`;
  const params = new URLSearchParams({
    where,
    outFields: '*',
    returnGeometry: 'true',
    f: 'geojson',
    outSR: '4326',
  });

  const url = `${layerUrl}/query?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TIGERweb API error: ${res.status} ${res.statusText}`);
  }

  const geojson = await res.json();

  if (!geojson.features || !Array.isArray(geojson.features)) {
    return [];
  }

  return geojson.features.map((f: any) => {
    const props = f.properties || {};
    const geoid = props.GEOID || props.GEOID20 || '';
    const name = props.NAMELSAD || props.NAMELSAD20 || props.NAME || geoid;

    return {
      zone_id: geoid,
      zone_name: name,
      geometry: f.geometry,
      properties: props,
    };
  });
}

/**
 * Convert TIGERweb features to standard GeoJSON FeatureCollection.
 */
export function toFeatureCollection(features: TigerFeature[]): any {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      properties: {
        GEOID: f.zone_id,
        NAMELSAD: f.zone_name,
        ...f.properties,
      },
      geometry: f.geometry,
    })),
  };
}
