import { describe, it, expect } from 'vitest';
import { parseBoundariesGeoJSON, pointInPolygon, pointInGeometry } from '../../lib/parsers/boundaries';
import fs from 'fs';
import path from 'path';

describe('parseBoundariesGeoJSON', () => {
  it('should parse the sample boundaries GeoJSON', () => {
    const geojson = fs.readFileSync(
      path.join(__dirname, '../../sample-data/boundaries.geojson'),
      'utf-8'
    );
    const boundaries = parseBoundariesGeoJSON(geojson);

    expect(boundaries).toHaveLength(4);
    expect(boundaries[0].zone_id).toBe('BG-001');
    expect(boundaries[0].zone_name).toBe('Block Group 1 - Oak/Elm');
    expect(boundaries[0].geometry.type).toBe('Polygon');
  });

  it('should throw on invalid GeoJSON', () => {
    expect(() => parseBoundariesGeoJSON('not json')).toThrow();
    expect(() => parseBoundariesGeoJSON('{"type":"Point"}')).toThrow('FeatureCollection');
  });
});

describe('pointInPolygon', () => {
  const square = [
    [
      [-83.003, 39.982],
      [-83.003, 39.986],
      [-82.999, 39.986],
      [-82.999, 39.982],
      [-83.003, 39.982],
    ],
  ];

  it('should return true for point inside polygon', () => {
    expect(pointInPolygon(39.984, -83.001, square)).toBe(true);
  });

  it('should return false for point outside polygon', () => {
    expect(pointInPolygon(39.990, -83.001, square)).toBe(false);
  });
});

describe('pointInGeometry', () => {
  it('should handle Polygon geometry', () => {
    const geom = {
      type: 'Polygon',
      coordinates: [
        [
          [-83.003, 39.982],
          [-83.003, 39.986],
          [-82.999, 39.986],
          [-82.999, 39.982],
          [-83.003, 39.982],
        ],
      ],
    };
    expect(pointInGeometry(39.984, -83.001, geom)).toBe(true);
    expect(pointInGeometry(39.990, -83.001, geom)).toBe(false);
  });

  it('should handle null geometry', () => {
    expect(pointInGeometry(39.984, -83.001, null)).toBe(false);
  });
});
