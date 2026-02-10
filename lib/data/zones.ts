import { query, queryOne } from '../db';

export interface Zone {
  id: string;
  run_id: string;
  zone_id: string;
  zone_name: string | null;
  geometry: any;
  parcel_count: number;
  transfer_count_10y: number;
  score_total: number;
  score_components: Record<string, number>;
  created_at: string;
}

export async function listZones(runId: string): Promise<Zone[]> {
  return query<Zone>(
    'SELECT * FROM zones WHERE run_id = $1 ORDER BY score_total DESC',
    [runId]
  );
}

export async function getZone(id: string): Promise<Zone | null> {
  return queryOne<Zone>('SELECT * FROM zones WHERE id = $1', [id]);
}

export async function getZoneParcels(runId: string, zoneId: string) {
  return query(
    `SELECT p.* FROM parcels p
     WHERE p.run_id = $1
     AND (p.zone_id_manual = $2 OR p.zone_id_manual = (SELECT zone_id FROM zones WHERE id = $2))
     ORDER BY p.owner_name`,
    [runId, zoneId]
  );
}

export async function deleteZonesForRun(runId: string): Promise<void> {
  await query('DELETE FROM zones WHERE run_id = $1', [runId]);
}
