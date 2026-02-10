import { ParsedParcel } from '../parsers/parcels';
import { ParsedTransfer } from '../parsers/transfers';
import { ParsedBoundary, pointInGeometry } from '../parsers/boundaries';

export interface ScoringWeights {
  weightTenure: number;
  weightTransferDensity: number;
  weightOwnerOccupancy: number;
  weightValueBand: number;
  penaltyRenter: number;
}

export interface ScoredZone {
  zone_id: string;
  zone_name: string | null;
  geometry: any;
  parcel_count: number;
  transfer_count_10y: number;
  score_total: number;
  score_components: {
    tenure: number;
    transfer_density: number;
    owner_occupancy: number;
    value_band: number;
    renter_penalty: number;
    reason: string;
  };
}

interface ZoneAccumulator {
  zone_id: string;
  zone_name: string | null;
  geometry: any;
  parcels: ParsedParcel[];
  transfers: ParsedTransfer[];
}

/**
 * Main aggregation and scoring function.
 *
 * 1. Assigns parcels to zones (via spatial join or manual zone_id).
 * 2. Computes per-zone scoring components.
 * 3. Returns ranked zones.
 */
export function aggregateAndScore(
  parcels: ParsedParcel[],
  transfers: ParsedTransfer[],
  boundaries: ParsedBoundary[],
  weights: ScoringWeights
): ScoredZone[] {
  const zones = new Map<string, ZoneAccumulator>();

  // If boundaries provided, use spatial assignment for parcels with lat/lon
  if (boundaries.length > 0) {
    // Initialize zones from boundaries
    for (const b of boundaries) {
      zones.set(b.zone_id, {
        zone_id: b.zone_id,
        zone_name: b.zone_name,
        geometry: b.geometry,
        parcels: [],
        transfers: [],
      });
    }

    // Assign parcels to zones
    for (const p of parcels) {
      let assigned = false;

      // Try spatial assignment first if lat/lon available
      if (p.lat != null && p.lon != null) {
        for (const b of boundaries) {
          if (pointInGeometry(p.lat, p.lon, b.geometry)) {
            zones.get(b.zone_id)!.parcels.push(p);
            // Also set zone_id_manual for DB storage
            p.zone_id_manual = b.zone_id;
            assigned = true;
            break;
          }
        }
      }

      // Fallback: use manual zone_id from parcel file
      if (!assigned && p.zone_id_manual) {
        const zone = zones.get(p.zone_id_manual);
        if (zone) {
          zone.parcels.push(p);
          assigned = true;
        }
      }

      // If still not assigned, put in a catch-all
      if (!assigned) {
        const unassignedId = '_unassigned';
        if (!zones.has(unassignedId)) {
          zones.set(unassignedId, {
            zone_id: unassignedId,
            zone_name: 'Unassigned Parcels',
            geometry: null,
            parcels: [],
            transfers: [],
          });
        }
        zones.get(unassignedId)!.parcels.push(p);
        p.zone_id_manual = unassignedId;
      }
    }
  } else {
    // No boundaries: group by manual zone_id or create a single zone
    for (const p of parcels) {
      const zid = p.zone_id_manual || '_all';
      if (!zones.has(zid)) {
        zones.set(zid, {
          zone_id: zid,
          zone_name: zid === '_all' ? 'All Parcels' : zid,
          geometry: null,
          parcels: [],
          transfers: [],
        });
      }
      zones.get(zid)!.parcels.push(p);
    }
  }

  // Assign transfers to zones by parcel_id linkage
  const parcelToZone = new Map<string, string>();
  zones.forEach((zone, zoneId) => {
    for (const p of zone.parcels) {
      if (p.parcel_id) {
        parcelToZone.set(p.parcel_id, zoneId);
      }
    }
  });

  for (const t of transfers) {
    if (t.parcel_id) {
      const zoneId = parcelToZone.get(t.parcel_id);
      if (zoneId && zones.has(zoneId)) {
        zones.get(zoneId)!.transfers.push(t);
      }
    }
  }

  // Compute global stats for normalization
  const allAssessedValues = parcels
    .map((p) => p.assessed_value)
    .filter((v): v is number => v != null);
  const globalMedianValue = median(allAssessedValues);

  // Score each zone
  const scored: ScoredZone[] = [];
  const now = new Date();
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());

  zones.forEach((zone) => {
    if (zone.parcels.length === 0) return;

    const parcelCount = zone.parcels.length;

    // --- Tenure Proxy ---
    // Median years since last transfer per parcel in zone
    const yearsSinceTransfer = zone.parcels
      .map((p) => {
        if (!p.last_sale_date) return null;
        const d = new Date(p.last_sale_date);
        return (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      })
      .filter((v): v is number => v != null);

    const medianTenure = median(yearsSinceTransfer);
    // Normalize: longer tenure = higher score (0-100 scale, capped at 30 years)
    const tenureScore = Math.min(medianTenure / 30, 1) * 100;

    // --- Transfer Density Proxy ---
    // Transfers per 1,000 parcels over last 10 years
    const recentTransfers = zone.transfers.filter((t) => {
      if (!t.sale_date) return false;
      return new Date(t.sale_date) >= tenYearsAgo;
    });
    const transferCount10y = recentTransfers.length;
    const transferDensity = (transferCount10y / parcelCount) * 1000;
    // Normalize: lower density = more stable = higher score for seller prospecting
    // Cap at 500 transfers per 1000 parcels
    const transferDensityScore = Math.max(0, (1 - Math.min(transferDensity / 500, 1))) * 100;

    // --- Owner Occupancy Proxy ---
    // Percent where mailing address differs from situs
    const addressChecked = zone.parcels.filter(
      (p) => p.situs_address && p.mailing_address
    );
    const absenteeCount = addressChecked.filter((p) => {
      const situs = (p.situs_address || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const mailing = (p.mailing_address || '').toLowerCase().replace(/\s+/g, ' ').trim();
      return situs !== mailing;
    }).length;

    const absenteeRate = addressChecked.length > 0
      ? absenteeCount / addressChecked.length
      : 0;
    // Higher absentee = more investor-owned = potential opportunity
    // But also factor in: moderate absentee is good, very high could mean all rentals
    const ownerOccupancyScore = absenteeRate * 100;

    // --- Value Band Fit Proxy ---
    // Based on how the zone's median assessed value compares to the global median
    const zoneValues = zone.parcels
      .map((p) => p.assessed_value)
      .filter((v): v is number => v != null);
    const zoneMedianValue = median(zoneValues);

    // Best fit = zone median is within 50-150% of global median
    let valueBandScore = 0;
    if (globalMedianValue > 0 && zoneMedianValue > 0) {
      const ratio = zoneMedianValue / globalMedianValue;
      if (ratio >= 0.5 && ratio <= 1.5) {
        valueBandScore = (1 - Math.abs(ratio - 1) / 0.5) * 100;
      } else {
        valueBandScore = 20; // Still some value for outliers
      }
    }

    // --- Renter Penalty ---
    // High absentee + low assessed value relative to transactions
    let renterPenalty = 0;
    if (absenteeRate > 0.6 && zoneMedianValue < globalMedianValue * 0.5) {
      renterPenalty = 50; // Significant penalty
    } else if (absenteeRate > 0.4 && zoneMedianValue < globalMedianValue * 0.7) {
      renterPenalty = 25; // Moderate penalty
    }

    // --- Composite Score ---
    const scoreTotal =
      tenureScore * weights.weightTenure +
      transferDensityScore * weights.weightTransferDensity +
      ownerOccupancyScore * weights.weightOwnerOccupancy +
      valueBandScore * weights.weightValueBand -
      renterPenalty * weights.penaltyRenter;

    // Build reason string
    const reasons: string[] = [];
    if (tenureScore > 60) reasons.push('Long average ownership tenure');
    if (transferDensityScore > 60) reasons.push('Low recent turnover');
    if (ownerOccupancyScore > 50) reasons.push('Notable absentee ownership');
    if (valueBandScore > 60) reasons.push('Value band fits target market');
    if (renterPenalty > 0) reasons.push('Possible high-renter area (penalty applied)');

    scored.push({
      zone_id: zone.zone_id,
      zone_name: zone.zone_name,
      geometry: zone.geometry,
      parcel_count: parcelCount,
      transfer_count_10y: transferCount10y,
      score_total: Math.round(scoreTotal * 100) / 100,
      score_components: {
        tenure: Math.round(tenureScore * 100) / 100,
        transfer_density: Math.round(transferDensityScore * 100) / 100,
        owner_occupancy: Math.round(ownerOccupancyScore * 100) / 100,
        value_band: Math.round(valueBandScore * 100) / 100,
        renter_penalty: Math.round(renterPenalty * 100) / 100,
        reason: reasons.join('; ') || 'Baseline scoring',
      },
    });
  });

  // Sort by score descending
  scored.sort((a, b) => b.score_total - a.score_total);
  return scored;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
