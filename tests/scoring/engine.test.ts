import { describe, it, expect } from 'vitest';
import { aggregateAndScore } from '../../lib/scoring/engine';
import { parseParcelsCSV } from '../../lib/parsers/parcels';
import { parseTransfersCSV } from '../../lib/parsers/transfers';
import { parseBoundariesGeoJSON } from '../../lib/parsers/boundaries';
import fs from 'fs';
import path from 'path';

const sampleDir = path.join(__dirname, '../../sample-data');

describe('aggregateAndScore', () => {
  it('should score zones from sample data with boundaries', async () => {
    const parcels = await parseParcelsCSV(
      fs.readFileSync(path.join(sampleDir, 'parcels.csv'), 'utf-8')
    );
    const transfers = await parseTransfersCSV(
      fs.readFileSync(path.join(sampleDir, 'transfers.csv'), 'utf-8')
    );
    const boundaries = parseBoundariesGeoJSON(
      fs.readFileSync(path.join(sampleDir, 'boundaries.geojson'), 'utf-8')
    );

    const zones = aggregateAndScore(parcels, transfers, boundaries, {
      weightTenure: 0.25,
      weightTransferDensity: 0.20,
      weightOwnerOccupancy: 0.25,
      weightValueBand: 0.20,
      penaltyRenter: 0.10,
    });

    expect(zones.length).toBeGreaterThan(0);

    // Zones should be sorted by score descending
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i - 1].score_total).toBeGreaterThanOrEqual(zones[i].score_total);
    }

    // Each zone should have score components
    for (const z of zones) {
      expect(z.score_components).toHaveProperty('tenure');
      expect(z.score_components).toHaveProperty('transfer_density');
      expect(z.score_components).toHaveProperty('owner_occupancy');
      expect(z.score_components).toHaveProperty('value_band');
      expect(z.score_components).toHaveProperty('reason');
    }
  });

  it('should score zones without boundaries (fallback to zone_id_manual)', async () => {
    const parcels = await parseParcelsCSV(
      fs.readFileSync(path.join(sampleDir, 'parcels.csv'), 'utf-8')
    );
    const transfers = await parseTransfersCSV(
      fs.readFileSync(path.join(sampleDir, 'transfers.csv'), 'utf-8')
    );

    const zones = aggregateAndScore(parcels, transfers, [], {
      weightTenure: 0.25,
      weightTransferDensity: 0.20,
      weightOwnerOccupancy: 0.25,
      weightValueBand: 0.20,
      penaltyRenter: 0.10,
    });

    expect(zones.length).toBeGreaterThan(0);
    // Should group by zone_id from CSV
    const zoneIds = zones.map((z) => z.zone_id);
    expect(zoneIds).toContain('BG-001');
  });

  it('should handle empty inputs', () => {
    const zones = aggregateAndScore([], [], [], {
      weightTenure: 0.25,
      weightTransferDensity: 0.20,
      weightOwnerOccupancy: 0.25,
      weightValueBand: 0.20,
      penaltyRenter: 0.10,
    });

    expect(zones).toHaveLength(0);
  });

  it('should respect custom weights', async () => {
    const parcels = await parseParcelsCSV(
      fs.readFileSync(path.join(sampleDir, 'parcels.csv'), 'utf-8')
    );

    const zonesDefault = aggregateAndScore(parcels, [], [], {
      weightTenure: 0.25,
      weightTransferDensity: 0.20,
      weightOwnerOccupancy: 0.25,
      weightValueBand: 0.20,
      penaltyRenter: 0.10,
    });

    const zonesHeavyTenure = aggregateAndScore(parcels, [], [], {
      weightTenure: 0.80,
      weightTransferDensity: 0.05,
      weightOwnerOccupancy: 0.05,
      weightValueBand: 0.05,
      penaltyRenter: 0.05,
    });

    // Different weights should produce different scores
    expect(zonesDefault[0].score_total).not.toBe(zonesHeavyTenure[0].score_total);
  });
});
