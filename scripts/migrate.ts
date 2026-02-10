import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

const migrations = [
  {
    name: '001_initial_schema',
    sql: `
      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        password_salt VARCHAR(255),
        image TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Organizations (brokerage)
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Memberships (roles)
      CREATE TABLE IF NOT EXISTS memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, org_id)
      );

      -- Campaigns
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        county VARCHAR(255),
        state VARCHAR(2),
        geography_type VARCHAR(50) DEFAULT 'block_group',
        goal_type VARCHAR(50) DEFAULT 'seller',
        weight_tenure REAL DEFAULT 0.25,
        weight_transfer_density REAL DEFAULT 0.20,
        weight_owner_occupancy REAL DEFAULT 0.25,
        weight_value_band REAL DEFAULT 0.20,
        penalty_renter REAL DEFAULT 0.10,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Runs
      CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Uploads
      CREATE TABLE IF NOT EXISTS uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        kind VARCHAR(50) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        mime VARCHAR(100),
        size INTEGER,
        storage_path TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Parcels
      CREATE TABLE IF NOT EXISTS parcels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        parcel_id VARCHAR(100),
        situs_address TEXT,
        city VARCHAR(100),
        state VARCHAR(2),
        zip VARCHAR(10),
        owner_name TEXT,
        mailing_address TEXT,
        mailing_city VARCHAR(100),
        mailing_state VARCHAR(2),
        mailing_zip VARCHAR(10),
        land_use VARCHAR(100),
        year_built INTEGER,
        assessed_value NUMERIC(14,2),
        last_sale_date DATE,
        last_sale_price NUMERIC(14,2),
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        geom JSONB,
        zone_id_manual VARCHAR(100),
        raw_record JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Transfers
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        parcel_id VARCHAR(100),
        sale_date DATE,
        sale_price NUMERIC(14,2),
        deed_type VARCHAR(100),
        recorded_date DATE,
        raw_record JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Zones
      CREATE TABLE IF NOT EXISTS zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        zone_id VARCHAR(100) NOT NULL,
        zone_name VARCHAR(255),
        geometry JSONB,
        parcel_count INTEGER DEFAULT 0,
        transfer_count_10y INTEGER DEFAULT 0,
        score_total REAL DEFAULT 0,
        score_components JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Touches
      CREATE TABLE IF NOT EXISTS touches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
        channel VARCHAR(50) NOT NULL,
        touch_date DATE NOT NULL,
        count INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(org_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id);
      CREATE INDEX IF NOT EXISTS idx_runs_campaign ON runs(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_uploads_run ON uploads(run_id);
      CREATE INDEX IF NOT EXISTS idx_parcels_run ON parcels(run_id);
      CREATE INDEX IF NOT EXISTS idx_parcels_parcel_id ON parcels(parcel_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_run ON transfers(run_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_parcel_id ON transfers(parcel_id);
      CREATE INDEX IF NOT EXISTS idx_zones_run ON zones(run_id);
      CREATE INDEX IF NOT EXISTS idx_zones_zone_id ON zones(zone_id);
      CREATE INDEX IF NOT EXISTS idx_touches_org ON touches(org_id);
      CREATE INDEX IF NOT EXISTS idx_touches_zone ON touches(zone_id);

      -- Migration tracking
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    name: '002_census_enrichment',
    sql: `
      -- Census enrichment data per zone
      CREATE TABLE IF NOT EXISTS census_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        geoid VARCHAR(20) NOT NULL,
        zone_name VARCHAR(255),
        total_population INTEGER,
        median_household_income NUMERIC(12,2),
        median_home_value NUMERIC(14,2),
        total_housing_units INTEGER,
        occupied_housing_units INTEGER,
        vacant_housing_units INTEGER,
        owner_occupied_units INTEGER,
        renter_occupied_units INTEGER,
        median_year_built INTEGER,
        median_gross_rent NUMERIC(10,2),
        pop_65_plus INTEGER,
        vacancy_rate REAL,
        owner_occupancy_rate REAL,
        senior_rate REAL,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_census_data_run ON census_data(run_id);
      CREATE INDEX IF NOT EXISTS idx_census_data_geoid ON census_data(geoid);

      -- HPI (Home Price Index) snapshots per campaign
      CREATE TABLE IF NOT EXISTS hpi_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        series_id VARCHAR(50),
        metro VARCHAR(100),
        latest_value REAL,
        latest_date DATE,
        yoy_change_pct REAL,
        five_year_change_pct REAL,
        data_points JSONB,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add census_data JSONB column to zones for merged enrichment
      ALTER TABLE zones ADD COLUMN IF NOT EXISTS census_data JSONB DEFAULT '{}';

      -- Add county_fips to campaigns for auto-fetch
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS county_fips VARCHAR(5);
    `,
  },
];

async function migrate() {
  const client = await pool.connect();
  try {
    // Ensure migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    for (const migration of migrations) {
      const existing = await client.query(
        'SELECT name FROM _migrations WHERE name = $1',
        [migration.name]
      );
      if (existing.rows.length > 0) {
        console.log(`Skipping ${migration.name} (already applied)`);
        continue;
      }
      console.log(`Applying ${migration.name}...`);
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [migration.name]
      );
      await client.query('COMMIT');
      console.log(`Applied ${migration.name}`);
    }

    console.log('All migrations complete.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
