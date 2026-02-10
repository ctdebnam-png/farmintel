/**
 * Census Bureau ACS 5-Year API client.
 *
 * Fetches demographic, housing, and economic data by tract or block group
 * for a given county/state. No API key required (but rate-limited to ~500 req/day
 * without one). Set CENSUS_API_KEY env var for higher limits.
 *
 * Data source: American Community Survey 5-Year Estimates
 * https://api.census.gov/data/2022/acs/acs5
 */

const BASE_URL = 'https://api.census.gov/data/2022/acs/acs5';

// Key ACS variables we fetch
const VARIABLES = {
  // Population
  B01003_001E: 'total_population',
  // Median household income
  B19013_001E: 'median_household_income',
  // Median home value (owner-occupied)
  B25077_001E: 'median_home_value',
  // Total housing units
  B25001_001E: 'total_housing_units',
  // Occupied housing units
  B25002_002E: 'occupied_housing_units',
  // Vacant housing units
  B25002_003E: 'vacant_housing_units',
  // Owner-occupied
  B25003_002E: 'owner_occupied_units',
  // Renter-occupied
  B25003_003E: 'renter_occupied_units',
  // Median year structure built
  B25035_001E: 'median_year_built',
  // Median gross rent
  B25064_001E: 'median_gross_rent',
  // Population 65 and over
  B01001_020E: 'pop_male_65_66',
  B01001_021E: 'pop_male_67_69',
  B01001_022E: 'pop_male_70_74',
  B01001_023E: 'pop_male_75_79',
  B01001_024E: 'pop_male_80_84',
  B01001_025E: 'pop_male_85_plus',
  B01001_044E: 'pop_female_65_66',
  B01001_045E: 'pop_female_67_69',
  B01001_046E: 'pop_female_70_74',
  B01001_047E: 'pop_female_75_79',
  B01001_048E: 'pop_female_80_84',
  B01001_049E: 'pop_female_85_plus',
};

const VARIABLE_KEYS = Object.keys(VARIABLES);

export interface CensusZoneData {
  geoid: string;
  name: string;
  state: string;
  county: string;
  tract: string;
  block_group?: string;
  total_population: number | null;
  median_household_income: number | null;
  median_home_value: number | null;
  total_housing_units: number | null;
  occupied_housing_units: number | null;
  vacant_housing_units: number | null;
  owner_occupied_units: number | null;
  renter_occupied_units: number | null;
  median_year_built: number | null;
  median_gross_rent: number | null;
  pop_65_plus: number | null;
  vacancy_rate: number | null;
  owner_occupancy_rate: number | null;
  senior_rate: number | null;
}

// Ohio FIPS: 39. County FIPS lookup for common Ohio counties.
export const OHIO_COUNTY_FIPS: Record<string, string> = {
  'adams': '001', 'allen': '003', 'ashland': '005', 'ashtabula': '007',
  'athens': '009', 'auglaize': '011', 'belmont': '013', 'brown': '015',
  'butler': '017', 'carroll': '019', 'champaign': '021', 'clark': '023',
  'clermont': '025', 'clinton': '027', 'columbiana': '029', 'coshocton': '031',
  'crawford': '033', 'cuyahoga': '035', 'darke': '037', 'defiance': '039',
  'delaware': '041', 'erie': '043', 'fairfield': '045', 'fayette': '047',
  'franklin': '049', 'fulton': '051', 'gallia': '053', 'geauga': '055',
  'greene': '057', 'guernsey': '059', 'hamilton': '061', 'hancock': '063',
  'hardin': '065', 'harrison': '067', 'henry': '069', 'highland': '071',
  'hocking': '073', 'holmes': '075', 'huron': '077', 'jackson': '079',
  'jefferson': '081', 'knox': '083', 'lake': '085', 'lawrence': '087',
  'licking': '089', 'logan': '091', 'lorain': '093', 'lucas': '095',
  'madison': '097', 'mahoning': '099', 'marion': '101', 'medina': '103',
  'meigs': '105', 'mercer': '107', 'miami': '109', 'monroe': '111',
  'montgomery': '113', 'morgan': '115', 'morrow': '117', 'muskingum': '119',
  'noble': '121', 'ottawa': '123', 'paulding': '125', 'perry': '127',
  'pickaway': '129', 'pike': '131', 'portage': '133', 'preble': '135',
  'putnam': '137', 'richland': '139', 'ross': '141', 'sandusky': '143',
  'scioto': '145', 'seneca': '147', 'shelby': '149', 'stark': '151',
  'summit': '153', 'trumbull': '155', 'tuscarawas': '157', 'union': '159',
  'van wert': '161', 'vinton': '163', 'warren': '165', 'washington': '167',
  'wayne': '169', 'williams': '171', 'wood': '173', 'wyandot': '175',
};

// All US state FIPS codes
export const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08',
  'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16',
  'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22',
  'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
  'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40',
  'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
  'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
  'WI': '55', 'WY': '56', 'DC': '11',
};

function parseNum(val: any): number | null {
  if (val == null || val === '' || val === '-666666666' || val === '-999999999') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Fetch Census ACS data for all tracts in a county.
 */
export async function fetchCensusTracts(
  stateFips: string,
  countyFips: string
): Promise<CensusZoneData[]> {
  const apiKey = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';
  const vars = VARIABLE_KEYS.join(',');
  const url = `${BASE_URL}?get=NAME,${vars}&for=tract:*&in=state:${stateFips}%20county:${countyFips}${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status} ${res.statusText}`);
  }

  const data: string[][] = await res.json();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });

    const vals: Record<string, number | null> = {};
    for (const [code, name] of Object.entries(VARIABLES)) {
      vals[name] = parseNum(obj[code]);
    }

    const totalPop = vals.total_population ?? 0;
    const totalHousing = vals.total_housing_units ?? 0;
    const occupied = vals.occupied_housing_units ?? 0;
    const ownerOcc = vals.owner_occupied_units ?? 0;

    // Sum 65+ population
    const pop65 = [
      vals.pop_male_65_66, vals.pop_male_67_69, vals.pop_male_70_74,
      vals.pop_male_75_79, vals.pop_male_80_84, vals.pop_male_85_plus,
      vals.pop_female_65_66, vals.pop_female_67_69, vals.pop_female_70_74,
      vals.pop_female_75_79, vals.pop_female_80_84, vals.pop_female_85_plus,
    ].reduce((s: number, v) => s + (v ?? 0), 0);

    return {
      geoid: `${obj.state}${obj.county}${obj.tract}`,
      name: obj.NAME || '',
      state: obj.state,
      county: obj.county,
      tract: obj.tract,
      total_population: vals.total_population,
      median_household_income: vals.median_household_income,
      median_home_value: vals.median_home_value,
      total_housing_units: vals.total_housing_units,
      occupied_housing_units: vals.occupied_housing_units,
      vacant_housing_units: vals.vacant_housing_units,
      owner_occupied_units: vals.owner_occupied_units,
      renter_occupied_units: vals.renter_occupied_units,
      median_year_built: vals.median_year_built,
      median_gross_rent: vals.median_gross_rent,
      pop_65_plus: pop65,
      vacancy_rate: totalHousing > 0 ? (vals.vacant_housing_units ?? 0) / totalHousing : null,
      owner_occupancy_rate: occupied > 0 ? ownerOcc / occupied : null,
      senior_rate: totalPop > 0 ? pop65 / totalPop : null,
    };
  });
}

/**
 * Fetch Census ACS data for all block groups in a county.
 */
export async function fetchCensusBlockGroups(
  stateFips: string,
  countyFips: string
): Promise<CensusZoneData[]> {
  const apiKey = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';
  const vars = VARIABLE_KEYS.join(',');
  const url = `${BASE_URL}?get=NAME,${vars}&for=block%20group:*&in=state:${stateFips}%20county:${countyFips}${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status} ${res.statusText}`);
  }

  const data: string[][] = await res.json();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });

    const vals: Record<string, number | null> = {};
    for (const [code, name] of Object.entries(VARIABLES)) {
      vals[name] = parseNum(obj[code]);
    }

    const totalPop = vals.total_population ?? 0;
    const totalHousing = vals.total_housing_units ?? 0;
    const occupied = vals.occupied_housing_units ?? 0;
    const ownerOcc = vals.owner_occupied_units ?? 0;

    const pop65 = [
      vals.pop_male_65_66, vals.pop_male_67_69, vals.pop_male_70_74,
      vals.pop_male_75_79, vals.pop_male_80_84, vals.pop_male_85_plus,
      vals.pop_female_65_66, vals.pop_female_67_69, vals.pop_female_70_74,
      vals.pop_female_75_79, vals.pop_female_80_84, vals.pop_female_85_plus,
    ].reduce((s: number, v) => s + (v ?? 0), 0);

    return {
      geoid: `${obj.state}${obj.county}${obj.tract}${obj['block group']}`,
      name: obj.NAME || '',
      state: obj.state,
      county: obj.county,
      tract: obj.tract,
      block_group: obj['block group'],
      total_population: vals.total_population,
      median_household_income: vals.median_household_income,
      median_home_value: vals.median_home_value,
      total_housing_units: vals.total_housing_units,
      occupied_housing_units: vals.occupied_housing_units,
      vacant_housing_units: vals.vacant_housing_units,
      owner_occupied_units: vals.owner_occupied_units,
      renter_occupied_units: vals.renter_occupied_units,
      median_year_built: vals.median_year_built,
      median_gross_rent: vals.median_gross_rent,
      pop_65_plus: pop65,
      vacancy_rate: totalHousing > 0 ? (vals.vacant_housing_units ?? 0) / totalHousing : null,
      owner_occupancy_rate: occupied > 0 ? ownerOcc / occupied : null,
      senior_rate: totalPop > 0 ? pop65 / totalPop : null,
    };
  });
}

/**
 * Resolve county name + state abbreviation to FIPS codes.
 */
export function resolveFips(county: string, state: string): { stateFips: string; countyFips: string } | null {
  const stateFips = STATE_FIPS[state.toUpperCase()];
  if (!stateFips) return null;

  // For Ohio, use our lookup. For other states, the caller needs to provide FIPS directly.
  if (state.toUpperCase() === 'OH') {
    const countyFips = OHIO_COUNTY_FIPS[county.toLowerCase()];
    if (!countyFips) return null;
    return { stateFips, countyFips };
  }

  return null; // Extend with other state county lookups as needed
}
