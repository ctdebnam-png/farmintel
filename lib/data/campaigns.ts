import { query, queryOne, execute } from '../db';

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  county: string | null;
  state: string | null;
  geography_type: string;
  goal_type: string;
  weight_tenure: number;
  weight_transfer_density: number;
  weight_owner_occupancy: number;
  weight_value_band: number;
  penalty_renter: number;
  created_by: string | null;
  created_at: string;
  run_count?: number;
  latest_run_status?: string;
}

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
  return query<Campaign>(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM runs r WHERE r.campaign_id = c.id) as run_count,
            (SELECT r.status FROM runs r WHERE r.campaign_id = c.id ORDER BY r.created_at DESC LIMIT 1) as latest_run_status
     FROM campaigns c
     WHERE c.org_id = $1
     ORDER BY c.created_at DESC`,
    [orgId]
  );
}

export async function getCampaign(id: string, orgId: string): Promise<Campaign | null> {
  return queryOne<Campaign>(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM runs r WHERE r.campaign_id = c.id) as run_count
     FROM campaigns c
     WHERE c.id = $1 AND c.org_id = $2`,
    [id, orgId]
  );
}

export async function createCampaign(data: {
  orgId: string;
  name: string;
  county?: string;
  state?: string;
  geographyType?: string;
  goalType?: string;
  createdBy: string;
}): Promise<Campaign> {
  const rows = await query<Campaign>(
    `INSERT INTO campaigns (org_id, name, county, state, geography_type, goal_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.orgId, data.name, data.county ?? null, data.state ?? null, data.geographyType ?? 'block_group', data.goalType ?? 'seller', data.createdBy]
  );
  return rows[0];
}

export async function updateCampaignWeights(
  id: string,
  orgId: string,
  weights: {
    weight_tenure: number;
    weight_transfer_density: number;
    weight_owner_occupancy: number;
    weight_value_band: number;
    penalty_renter: number;
  }
): Promise<void> {
  await execute(
    `UPDATE campaigns
     SET weight_tenure = $3, weight_transfer_density = $4,
         weight_owner_occupancy = $5, weight_value_band = $6, penalty_renter = $7
     WHERE id = $1 AND org_id = $2`,
    [id, orgId, weights.weight_tenure, weights.weight_transfer_density, weights.weight_owner_occupancy, weights.weight_value_band, weights.penalty_renter]
  );
}

export async function deleteCampaign(id: string, orgId: string): Promise<void> {
  await execute('DELETE FROM campaigns WHERE id = $1 AND org_id = $2', [id, orgId]);
}
