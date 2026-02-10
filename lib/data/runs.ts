import { query, queryOne, execute } from '../db';

export interface Run {
  id: string;
  campaign_id: string;
  name: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
  upload_count?: number;
  parcel_count?: number;
  zone_count?: number;
}

export async function listRuns(campaignId: string): Promise<Run[]> {
  return query<Run>(
    `SELECT r.*,
            (SELECT COUNT(*)::int FROM uploads u WHERE u.run_id = r.id) as upload_count,
            (SELECT COUNT(*)::int FROM parcels p WHERE p.run_id = r.id) as parcel_count,
            (SELECT COUNT(*)::int FROM zones z WHERE z.run_id = r.id) as zone_count
     FROM runs r
     WHERE r.campaign_id = $1
     ORDER BY r.created_at DESC`,
    [campaignId]
  );
}

export async function getRun(id: string): Promise<Run | null> {
  return queryOne<Run>(
    `SELECT r.*,
            (SELECT COUNT(*)::int FROM uploads u WHERE u.run_id = r.id) as upload_count,
            (SELECT COUNT(*)::int FROM parcels p WHERE p.run_id = r.id) as parcel_count,
            (SELECT COUNT(*)::int FROM zones z WHERE z.run_id = r.id) as zone_count
     FROM runs r
     WHERE r.id = $1`,
    [id]
  );
}

export async function createRun(data: {
  campaignId: string;
  name?: string;
  notes?: string;
}): Promise<Run> {
  const rows = await query<Run>(
    `INSERT INTO runs (campaign_id, name, notes)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.campaignId, data.name ?? null, data.notes ?? null]
  );
  return rows[0];
}

export async function updateRunStatus(id: string, status: string): Promise<void> {
  const extra =
    status === 'running' ? ', started_at = NOW()' :
    status === 'complete' ? ', finished_at = NOW()' : '';
  await execute(
    `UPDATE runs SET status = $2${extra} WHERE id = $1`,
    [id, status]
  );
}

export async function deleteRun(id: string): Promise<void> {
  await execute('DELETE FROM runs WHERE id = $1', [id]);
}
