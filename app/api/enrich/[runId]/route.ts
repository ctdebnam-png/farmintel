import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRun, updateRunStatus } from '@/lib/data/runs';
import { query, execute } from '@/lib/db';
import { fetchCensusTracts, fetchCensusBlockGroups, resolveFips, CensusZoneData } from '@/lib/sources/census';
import { fetchTractBoundaries, fetchBlockGroupBoundaries, TigerFeature } from '@/lib/sources/tiger';
import { fetchHPI } from '@/lib/sources/fred';

export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await getRun(params.runId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  // Get campaign details
  const campaigns = await query(
    'SELECT * FROM campaigns WHERE id = $1',
    [run.campaign_id]
  );
  const campaign = campaigns[0];
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const county = campaign.county;
  const state = campaign.state;

  if (!county || !state) {
    return NextResponse.json({ error: 'Campaign must have county and state set to auto-fetch data' }, { status: 400 });
  }

  // Resolve FIPS codes
  const fips = resolveFips(county, state);
  if (!fips) {
    return NextResponse.json({
      error: `Could not resolve FIPS codes for ${county}, ${state}. For non-Ohio counties, set county_fips manually on the campaign.`
    }, { status: 400 });
  }

  const results: Record<string, any> = {};

  try {
    // 1. Fetch Census boundaries (TIGER/Line)
    const geoType = campaign.geography_type || 'tract';
    let boundaries: TigerFeature[];
    if (geoType === 'block_group') {
      boundaries = await fetchBlockGroupBoundaries(fips.stateFips, fips.countyFips);
    } else {
      boundaries = await fetchTractBoundaries(fips.stateFips, fips.countyFips);
    }
    results.boundaries = boundaries.length;

    // Store boundaries as zones (clear existing first)
    await execute('DELETE FROM zones WHERE run_id = $1', [params.runId]);
    for (const b of boundaries) {
      await execute(
        `INSERT INTO zones (run_id, zone_id, zone_name, geometry)
         VALUES ($1, $2, $3, $4)`,
        [params.runId, b.zone_id, b.zone_name, JSON.stringify(b.geometry)]
      );
    }

    // 2. Fetch Census demographic data
    let censusData: CensusZoneData[];
    if (geoType === 'block_group') {
      censusData = await fetchCensusBlockGroups(fips.stateFips, fips.countyFips);
    } else {
      censusData = await fetchCensusTracts(fips.stateFips, fips.countyFips);
    }
    results.census_zones = censusData.length;

    // Store census data
    await execute('DELETE FROM census_data WHERE run_id = $1', [params.runId]);
    for (const c of censusData) {
      await execute(
        `INSERT INTO census_data (run_id, geoid, zone_name, total_population,
          median_household_income, median_home_value, total_housing_units,
          occupied_housing_units, vacant_housing_units, owner_occupied_units,
          renter_occupied_units, median_year_built, median_gross_rent,
          pop_65_plus, vacancy_rate, owner_occupancy_rate, senior_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          params.runId, c.geoid, c.name, c.total_population,
          c.median_household_income, c.median_home_value, c.total_housing_units,
          c.occupied_housing_units, c.vacant_housing_units, c.owner_occupied_units,
          c.renter_occupied_units, c.median_year_built, c.median_gross_rent,
          c.pop_65_plus, c.vacancy_rate, c.owner_occupancy_rate, c.senior_rate,
        ]
      );
    }

    // Merge census data into zones
    for (const c of censusData) {
      await execute(
        `UPDATE zones SET census_data = $3
         WHERE run_id = $1 AND zone_id = $2`,
        [
          params.runId,
          c.geoid,
          JSON.stringify({
            total_population: c.total_population,
            median_household_income: c.median_household_income,
            median_home_value: c.median_home_value,
            total_housing_units: c.total_housing_units,
            vacancy_rate: c.vacancy_rate,
            owner_occupancy_rate: c.owner_occupancy_rate,
            senior_rate: c.senior_rate,
            median_year_built: c.median_year_built,
            median_gross_rent: c.median_gross_rent,
          }),
        ]
      );
    }

    // 3. Try HPI (optional, requires FRED_API_KEY)
    if (process.env.FRED_API_KEY) {
      try {
        // Try metro name from county (rough mapping)
        const metroGuess = guessMetro(county);
        const hpi = await fetchHPI(metroGuess);
        results.hpi = {
          metro: hpi.metro,
          latest: hpi.latest_value,
          yoy: hpi.yoy_change_pct,
        };

        await execute(
          `INSERT INTO hpi_data (campaign_id, series_id, metro, latest_value, latest_date,
            yoy_change_pct, five_year_change_pct, data_points)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            campaign.id, hpi.series_id, hpi.metro, hpi.latest_value,
            hpi.latest_date, hpi.yoy_change_pct, hpi.five_year_change_pct,
            JSON.stringify(hpi.data_points),
          ]
        );
      } catch (e: any) {
        results.hpi_error = e.message;
      }
    } else {
      results.hpi_skipped = 'Set FRED_API_KEY to enable home price index data';
    }

    // Save county_fips on campaign for future use
    await execute(
      'UPDATE campaigns SET county_fips = $2 WHERE id = $1',
      [campaign.id, `${fips.stateFips}${fips.countyFips}`]
    );

    return NextResponse.json({
      success: true,
      county: `${county}, ${state}`,
      fips: `${fips.stateFips}${fips.countyFips}`,
      ...results,
    });
  } catch (e: any) {
    console.error('Enrichment error:', e);
    return NextResponse.json({ error: e.message || 'Enrichment failed' }, { status: 500 });
  }
}

function guessMetro(county: string): string | undefined {
  const c = county.toLowerCase();
  if (['franklin', 'delaware', 'fairfield', 'licking', 'pickaway', 'madison', 'union', 'morrow'].includes(c)) return 'columbus';
  if (['cuyahoga', 'lake', 'geauga', 'lorain', 'medina'].includes(c)) return 'cleveland';
  if (['hamilton', 'butler', 'clermont', 'warren'].includes(c)) return 'cincinnati';
  if (['montgomery', 'greene', 'miami', 'clark', 'preble'].includes(c)) return 'dayton';
  if (['summit', 'portage'].includes(c)) return 'akron';
  if (['lucas', 'wood', 'fulton'].includes(c)) return 'toledo';
  if (['mahoning', 'trumbull', 'columbiana'].includes(c)) return 'youngstown';
  if (['stark', 'carroll', 'tuscarawas'].includes(c)) return 'canton';
  return undefined; // Falls back to national HPI
}
