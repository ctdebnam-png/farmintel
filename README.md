# FarmIntel — Area Farming Intelligence

Internal area farming intelligence web app for TD Realty Ohio. Ranks geographic zones by prospecting potential using publicly available county auditor and recorder data. No IDX, MLS, or scraping involved.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres
docker compose up -d

# 3. Copy environment config
cp .env.local.example .env.local

# 4. Run database migrations
npm run db:migrate

# 5. Seed demo user
npm run db:seed

# 6. Start dev server
npm run dev
```

Open http://localhost:3000 and sign in with `demo@tdrealty.com` / `demo1234`.

## Architecture

- **Next.js 14** App Router with server actions
- **Postgres** for persistent storage (plain SQL, no ORM)
- **NextAuth v5** for authentication (credentials + optional GitHub OAuth)
- **Tailwind CSS** for styling
- **Leaflet** for interactive zone maps
- **Docker Compose** for local Postgres

## Data Flow

```
Upload CSV/GeoJSON → Parse & Normalize → Store in Postgres
    → Assign Parcels to Zones → Score Zones → Ranked Output
        → Map View / Table View / CSV Export / KML Export / PDF Summary
```

## Core Concepts

### Campaign
A campaign targets a specific county, geography type (block group, tract, etc.), and goal (seller/buyer prospecting). Scoring weights are configurable per campaign.

### Run
Each run within a campaign ingests one set of files (parcels CSV, optionally transfers CSV and boundaries GeoJSON), processes them through the pipeline, and produces scored zones.

### Zone Scoring
Zones are scored using a weighted sum of transparent components:

| Component | Description | Default Weight |
|-----------|-------------|---------------|
| Tenure Proxy | Median years since last transfer | 0.25 |
| Transfer Density | Transfers per 1,000 parcels (10y) | 0.20 |
| Owner Occupancy | Percent absentee ownership | 0.25 |
| Value Band Fit | How zone median matches overall | 0.20 |
| Renter Penalty | Penalty for high-renter, low-value | 0.10 |

## Expected File Formats

### Parcels CSV
Required: `parcel_id` (or `PIN`, `APN`).
Recognized columns: `situs_address`, `city`, `state`, `zip`, `owner_name`, `mailing_address`, `mailing_city`, `mailing_state`, `mailing_zip`, `land_use`, `year_built`, `assessed_value`, `last_sale_date`, `last_sale_price`, `lat`, `lon`, `zone_id` (or `block_group`, `tract`).

Column names are matched case-insensitively with common variations (see `lib/parsers/column-mapping.ts`). For a new county, create a JSON mapping file (see `sample-data/county-mapping-example.json`).

### Transfers CSV
Recognized columns: `parcel_id`, `sale_date`, `sale_price`, `deed_type`, `recorded_date`.

### Boundaries GeoJSON
Standard GeoJSON FeatureCollection. Each feature should have a zone identifier in properties (`GEOID`, `TRACTCE`, `BLKGRPCE`, `zone_id`, or `NAME`).

## CLI Scripts

```bash
# Ingestion (alternative to web UI)
npm run ingest:parcels -- --run-id <uuid> --file <path>
npm run ingest:transfers -- --run-id <uuid> --file <path>
npm run ingest:boundaries -- --run-id <uuid> --file <path>

# Scoring
npm run score:zones -- --run-id <uuid>

# Exports
npm run export:csv -- --run-id <uuid> [--output <path>]
npm run export:kml -- --run-id <uuid> [--output <path>]
npm run export:pdf -- --run-id <uuid> [--output <path>]
```

## UI Pages

| Path | Description |
|------|-------------|
| `/app/dashboard` | Campaign list, recent runs, status |
| `/app/campaigns/new` | Create new campaign |
| `/app/campaigns/[id]` | Campaign config, weights, runs list |
| `/app/runs/[id]` | File upload, pipeline control |
| `/app/runs/[id]/map` | Leaflet map with scored zones |
| `/app/runs/[id]/zones` | Ranked zone table |
| `/app/runs/[id]/zones/[zoneId]` | Zone detail with parcel drill-down |
| `/app/admin/users` | Team member management |

## Exports

- **CSV**: Owner name, mailing address, segment label, message variant code (A/B/C)
- **KML**: Zone polygons with score and reason for Google My Maps
- **PDF**: HTML summary page (print to PDF) with zone metrics and recommended contact cadence

## Sample Data

The `sample-data/` folder contains synthetic data for 20 parcels across 4 block groups in Columbus, OH:
- `parcels.csv` — 20 synthetic parcels
- `transfers.csv` — 23 synthetic transfers
- `boundaries.geojson` — 4 block group polygons
- `county-mapping-example.json` — Example column mapping config

## Testing

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
```

Tests cover CSV parsing (including edge cases), GeoJSON parsing, point-in-polygon, and the scoring engine.

## Database

Uses plain SQL with a migration runner. Tables: `users`, `organizations`, `memberships`, `campaigns`, `runs`, `uploads`, `parcels`, `transfers`, `zones`, `touches`.

Geometry stored as GeoJSON in JSONB columns. Can be upgraded to PostGIS later — the storage and query interface is designed for this.

## Enrichment

If parcels lack lat/lon coordinates:
1. Upload a separate `parcel_id → lat,lon` CSV via the enrichment step
2. Or include a `zone_id` / `block_group` / `tract` column in the parcels CSV for direct zone assignment without spatial join
