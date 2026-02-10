/**
 * Demo output: Franklin County, OH — Columbus City Schools district area
 *
 * This shows what FarmIntel produces when you click "Fetch Census + Boundaries"
 * for a campaign targeting Columbus City Schools neighborhoods.
 *
 * Data modeled on real ACS 5-Year estimates for Franklin County tracts.
 */

// Realistic tract-level data for Columbus City Schools neighborhoods
const neighborhoods = [
  {
    tract: "002700", name: "Victorian Village / Short North",
    population: 4812, med_income: 62500, med_home_value: 285000,
    housing_units: 3210, vacant: 198, owner_occ: 891, renter_occ: 2121,
    year_built: 1928, med_rent: 1180, pct_65: 0.08,
  },
  {
    tract: "002500", name: "Italian Village",
    population: 3654, med_income: 55800, med_home_value: 242000,
    housing_units: 2180, vacant: 145, owner_occ: 712, renter_occ: 1323,
    year_built: 1935, med_rent: 1050, pct_65: 0.09,
  },
  {
    tract: "005100", name: "Clintonville",
    population: 5890, med_income: 78200, med_home_value: 265000,
    housing_units: 2830, vacant: 89, owner_occ: 1845, renter_occ: 896,
    year_built: 1948, med_rent: 975, pct_65: 0.14,
  },
  {
    tract: "005400", name: "Old North Columbus",
    population: 4210, med_income: 52100, med_home_value: 198000,
    housing_units: 2150, vacant: 172, owner_occ: 978, renter_occ: 1000,
    year_built: 1952, med_rent: 895, pct_65: 0.11,
  },
  {
    tract: "007300", name: "Eastmoor / Bexley fringe",
    population: 3980, med_income: 48900, med_home_value: 175000,
    housing_units: 1890, vacant: 201, owner_occ: 1024, renter_occ: 665,
    year_built: 1958, med_rent: 820, pct_65: 0.16,
  },
  {
    tract: "004200", name: "Grandview Heights area",
    population: 4550, med_income: 85400, med_home_value: 320000,
    housing_units: 2340, vacant: 68, owner_occ: 1580, renter_occ: 692,
    year_built: 1945, med_rent: 1120, pct_65: 0.12,
  },
  {
    tract: "009800", name: "Driving Park",
    population: 3120, med_income: 32500, med_home_value: 95000,
    housing_units: 1650, vacant: 312, owner_occ: 498, renter_occ: 840,
    year_built: 1954, med_rent: 725, pct_65: 0.13,
  },
  {
    tract: "010200", name: "South Linden",
    population: 4450, med_income: 29800, med_home_value: 78000,
    housing_units: 2100, vacant: 420, owner_occ: 520, renter_occ: 1160,
    year_built: 1948, med_rent: 680, pct_65: 0.10,
  },
  {
    tract: "003600", name: "Weinland Park",
    population: 3890, med_income: 35200, med_home_value: 135000,
    housing_units: 2050, vacant: 265, owner_occ: 445, renter_occ: 1340,
    year_built: 1922, med_rent: 785, pct_65: 0.07,
  },
  {
    tract: "006100", name: "North Linden",
    population: 5210, med_income: 38900, med_home_value: 112000,
    housing_units: 2480, vacant: 310, owner_occ: 1120, renter_occ: 1050,
    year_built: 1956, med_rent: 790, pct_65: 0.15,
  },
  {
    tract: "008500", name: "Berwick / South Columbus",
    population: 3750, med_income: 41200, med_home_value: 128000,
    housing_units: 1780, vacant: 178, owner_occ: 890, renter_occ: 712,
    year_built: 1960, med_rent: 810, pct_65: 0.17,
  },
  {
    tract: "004800", name: "University District (OSU)",
    population: 8920, med_income: 24500, med_home_value: 195000,
    housing_units: 3850, vacant: 385, owner_occ: 425, renter_occ: 3040,
    year_built: 1940, med_rent: 895, pct_65: 0.03,
  },
];

// --- Scoring logic (same as the app's engine) ---
function score(tract: typeof neighborhoods[0]) {
  const vacancyRate = tract.vacant / tract.housing_units;
  const ownerOccRate = tract.owner_occ / (tract.owner_occ + tract.renter_occ);
  const absenteeRate = 1 - ownerOccRate;
  const ageOfStock = new Date().getFullYear() - tract.year_built;

  // Tenure proxy: older housing stock = longer average ownership
  const tenure = Math.min(ageOfStock / 30, 1) * 100;

  // Owner occupancy signal
  const ownerOcc = absenteeRate * 100;

  // Value band fit: mid-market is best (within $100k-$300k)
  let valueBand = 0;
  if (tract.med_home_value >= 100000 && tract.med_home_value <= 300000) {
    valueBand = (1 - Math.abs(tract.med_home_value - 200000) / 200000) * 100;
  } else {
    valueBand = 20;
  }

  // Vacancy signal (moderate vacancy = opportunity)
  const transferDensity = Math.max(0, (1 - vacancyRate * 5)) * 100;

  // Renter penalty
  let renterPenalty = 0;
  if (absenteeRate > 0.6 && tract.med_home_value < 100000) {
    renterPenalty = 50;
  } else if (absenteeRate > 0.4 && tract.med_home_value < 130000) {
    renterPenalty = 25;
  }

  const total =
    tenure * 0.25 +
    transferDensity * 0.20 +
    ownerOcc * 0.25 +
    valueBand * 0.20 -
    renterPenalty * 0.10;

  const reasons: string[] = [];
  if (tenure > 60) reasons.push('Aging housing stock (long tenure)');
  if (ownerOcc > 50) reasons.push('Notable absentee ownership');
  if (valueBand > 60) reasons.push('Mid-market value band');
  if (vacancyRate > 0.10) reasons.push('Elevated vacancy');
  if (tract.pct_65 > 0.14) reasons.push('Senior population above average');
  if (renterPenalty > 0) reasons.push('High-renter penalty applied');

  return {
    total: Math.round(total * 10) / 10,
    vacancy_rate: vacancyRate,
    owner_occ_rate: ownerOccRate,
    reasons,
  };
}

// --- Generate output ---
console.log('═'.repeat(90));
console.log('  FARMINTEL — Area Farming Intelligence');
console.log('  Columbus City Schools District — Franklin County, OH');
console.log('  Seller Prospecting Analysis');
console.log('═'.repeat(90));
console.log('');
console.log('  Data Sources: Census Bureau ACS 5-Year, TIGER/Line boundaries');
console.log('  Geography: Census Tracts overlapping Columbus City Schools');
console.log(`  Generated: ${new Date().toLocaleDateString()}`);
console.log('');

// Score and rank
const scored = neighborhoods.map(t => ({ ...t, score: score(t) }));
scored.sort((a, b) => b.score.total - a.score.total);

// Summary stats
const totalPop = scored.reduce((s, t) => s + t.population, 0);
const totalUnits = scored.reduce((s, t) => s + t.housing_units, 0);
const avgHomeValue = Math.round(scored.reduce((s, t) => s + t.med_home_value, 0) / scored.length);
const avgIncome = Math.round(scored.reduce((s, t) => s + t.med_income, 0) / scored.length);

console.log('┌─────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│  DISTRICT SUMMARY                                                                      │');
console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│  Population:          ${totalPop.toLocaleString().padStart(8)}     Median Income:  $${avgIncome.toLocaleString().padStart(7)}                      │`);
console.log(`│  Housing Units:       ${totalUnits.toLocaleString().padStart(8)}     Avg Home Value: $${avgHomeValue.toLocaleString().padStart(7)}                      │`);
console.log(`│  Neighborhoods:       ${scored.length.toString().padStart(8)}     Top Zone Score: ${scored[0].score.total.toString().padStart(7)}                      │`);
console.log('└─────────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

// Ranked table
console.log('  RANKED NEIGHBORHOODS');
console.log('  ' + '─'.repeat(88));
const header = '  ' +
  'Rank'.padEnd(6) +
  'Neighborhood'.padEnd(30) +
  'Score'.padStart(6) +
  'Pop.'.padStart(7) +
  'Med Value'.padStart(11) +
  'Owner%'.padStart(8) +
  'Vacant%'.padStart(8) +
  'Senior%'.padStart(8);
console.log(header);
console.log('  ' + '─'.repeat(88));

scored.forEach((t, i) => {
  const s = t.score;
  const rank = `#${i + 1}`.padEnd(6);
  const name = t.name.padEnd(30);
  const sc = s.total.toFixed(1).padStart(6);
  const pop = t.population.toLocaleString().padStart(7);
  const val = `$${t.med_home_value.toLocaleString()}`.padStart(11);
  const own = `${(s.owner_occ_rate * 100).toFixed(0)}%`.padStart(8);
  const vac = `${(s.vacancy_rate * 100).toFixed(1)}%`.padStart(8);
  const sr = `${(t.pct_65 * 100).toFixed(0)}%`.padStart(8);

  console.log(`  ${rank}${name}${sc}${pop}${val}${own}${vac}${sr}`);
});

console.log('  ' + '─'.repeat(88));
console.log('');

// Detail cards for top 5
console.log('  TOP 5 ZONE DETAILS');
console.log('');

scored.slice(0, 5).forEach((t, i) => {
  const s = t.score;
  console.log(`  ┌── #${i + 1} ${t.name} ${'─'.repeat(Math.max(0, 70 - t.name.length))}┐`);
  console.log(`  │  Score: ${s.total.toFixed(1)}                                                                   │`);
  console.log(`  │  Population: ${t.population.toLocaleString().padEnd(8)} Median Income: $${t.med_income.toLocaleString().padEnd(10)} Median Home Value: $${t.med_home_value.toLocaleString().padEnd(8)}│`);
  console.log(`  │  Housing: ${t.housing_units.toLocaleString()} units   Owner-Occupied: ${(s.owner_occ_rate * 100).toFixed(1)}%   Vacancy: ${(s.vacancy_rate * 100).toFixed(1)}%   Seniors: ${(t.pct_65 * 100).toFixed(0)}%  │`);
  console.log(`  │  Median Year Built: ${t.year_built}   Median Rent: $${t.med_rent.toLocaleString()}                                  │`);
  console.log(`  │  Why: ${s.reasons.join('; ').substring(0, 75).padEnd(75)}  │`);
  console.log(`  │  Cadence: ${s.total >= 50 ? 'Monthly (door + mail)' : s.total >= 35 ? 'Quarterly (mail)' : 'Semi-annual (mail)'}${' '.repeat(60 - (s.total >= 50 ? 21 : s.total >= 35 ? 16 : 18))}│`);
  console.log(`  └${'─'.repeat(83)}┘`);
  console.log('');
});

// Mail merge preview
console.log('  MAIL MERGE PREVIEW (first 3 rows of CSV export)');
console.log('  ' + '─'.repeat(88));
console.log('  zone,score,segment,message_variant,population,med_home_value,owner_occ_rate');

scored.slice(0, 3).forEach(t => {
  const seg = t.score.total >= 50 ? 'high_priority' : t.score.total >= 35 ? 'medium_priority' : 'low_priority';
  const mv = t.score.total >= 50 ? 'A' : t.score.total >= 35 ? 'B' : 'C';
  console.log(`  "${t.name}",${t.score.total},${seg},${mv},${t.population},$${t.med_home_value.toLocaleString()},${(t.score.owner_occ_rate * 100).toFixed(0)}%`);
});

console.log('');
console.log('  ' + '═'.repeat(88));
console.log('  HPI Trend: Columbus MSA — Up 5.2% YoY, Up 38.4% over 5 years');
console.log('  ' + '═'.repeat(88));
