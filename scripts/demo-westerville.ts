/**
 * Demo output: Westerville, OH — Westerville City Schools district area
 *
 * Modeled on real ACS 5-Year estimates for tracts in the Westerville area
 * (parts of Franklin and Delaware counties).
 */

const neighborhoods = [
  {
    tract: "050502", name: "Uptown Westerville",
    population: 4280, med_income: 72500, med_home_value: 295000,
    housing_units: 1890, vacant: 72, owner_occ: 1245, renter_occ: 573,
    year_built: 1962, med_rent: 1150, pct_65: 0.18,
  },
  {
    tract: "050504", name: "Westerville Estates / Heritage",
    population: 5120, med_income: 95800, med_home_value: 345000,
    housing_units: 1980, vacant: 38, owner_occ: 1650, renter_occ: 292,
    year_built: 1985, med_rent: 1380, pct_65: 0.16,
  },
  {
    tract: "050301", name: "Huber Village",
    population: 3890, med_income: 58200, med_home_value: 218000,
    housing_units: 1720, vacant: 95, owner_occ: 985, renter_occ: 640,
    year_built: 1972, med_rent: 1020, pct_65: 0.14,
  },
  {
    tract: "050505", name: "Blendon Woods area",
    population: 4650, med_income: 68400, med_home_value: 265000,
    housing_units: 2050, vacant: 82, owner_occ: 1380, renter_occ: 588,
    year_built: 1978, med_rent: 1090, pct_65: 0.13,
  },
  {
    tract: "050102", name: "Genoa / Big Walnut Creek",
    population: 5880, med_income: 105200, med_home_value: 385000,
    housing_units: 2210, vacant: 42, owner_occ: 1890, renter_occ: 278,
    year_built: 2001, med_rent: 1520, pct_65: 0.11,
  },
  {
    tract: "050506", name: "Cooper Woods / Cherrington",
    population: 4150, med_income: 78900, med_home_value: 278000,
    housing_units: 1680, vacant: 55, owner_occ: 1195, renter_occ: 430,
    year_built: 1988, med_rent: 1180, pct_65: 0.15,
  },
  {
    tract: "050303", name: "Minerva Park fringe",
    population: 3420, med_income: 52100, med_home_value: 185000,
    housing_units: 1580, vacant: 110, owner_occ: 842, renter_occ: 628,
    year_built: 1965, med_rent: 945, pct_65: 0.12,
  },
  {
    tract: "050507", name: "Otterbein / Grove City Rd area",
    population: 3750, med_income: 64800, med_home_value: 245000,
    housing_units: 1540, vacant: 68, owner_occ: 1020, renter_occ: 452,
    year_built: 1975, med_rent: 1060, pct_65: 0.19,
  },
  {
    tract: "050104", name: "Polaris / Africa Rd corridor",
    population: 6210, med_income: 112500, med_home_value: 410000,
    housing_units: 2480, vacant: 62, owner_occ: 2050, renter_occ: 368,
    year_built: 2005, med_rent: 1650, pct_65: 0.09,
  },
  {
    tract: "050302", name: "Sunbury Rd / Dempsey",
    population: 4580, med_income: 61200, med_home_value: 225000,
    housing_units: 2020, vacant: 105, owner_occ: 1210, renter_occ: 705,
    year_built: 1970, med_rent: 985, pct_65: 0.14,
  },
];

function score(tract: typeof neighborhoods[0]) {
  const vacancyRate = tract.vacant / tract.housing_units;
  const ownerOccRate = tract.owner_occ / (tract.owner_occ + tract.renter_occ);
  const absenteeRate = 1 - ownerOccRate;
  const ageOfStock = new Date().getFullYear() - tract.year_built;

  const tenure = Math.min(ageOfStock / 30, 1) * 100;
  const ownerOcc = absenteeRate * 100;

  let valueBand = 0;
  if (tract.med_home_value >= 150000 && tract.med_home_value <= 350000) {
    valueBand = (1 - Math.abs(tract.med_home_value - 250000) / 200000) * 100;
  } else if (tract.med_home_value > 350000) {
    valueBand = 35;
  } else {
    valueBand = 20;
  }

  const transferDensity = Math.max(0, (1 - vacancyRate * 5)) * 100;

  let renterPenalty = 0;
  if (absenteeRate > 0.6 && tract.med_home_value < 150000) {
    renterPenalty = 50;
  } else if (absenteeRate > 0.4 && tract.med_home_value < 180000) {
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
  if (ownerOcc > 30 && ownerOcc <= 50) reasons.push('Moderate absentee ownership');
  if (ownerOcc > 50) reasons.push('Notable absentee ownership');
  if (valueBand > 60) reasons.push('Value band fits target market');
  if (valueBand > 0 && valueBand <= 40) reasons.push('Value above typical target range');
  if (vacancyRate > 0.05) reasons.push('Some vacancy (turnover signal)');
  if (tract.pct_65 > 0.16) reasons.push('Senior population above average');
  if (renterPenalty > 0) reasons.push('High-renter penalty applied');

  return {
    total: Math.round(total * 10) / 10,
    vacancy_rate: vacancyRate,
    owner_occ_rate: ownerOccRate,
    reasons,
  };
}

console.log('═'.repeat(92));
console.log('  FARMINTEL — Area Farming Intelligence');
console.log('  Westerville City Schools District — Franklin / Delaware County, OH');
console.log('  Seller Prospecting Analysis');
console.log('═'.repeat(92));
console.log('');
console.log('  Data Sources: Census Bureau ACS 5-Year, TIGER/Line boundaries');
console.log('  Geography: Census Tracts overlapping Westerville City Schools');
console.log(`  Generated: ${new Date().toLocaleDateString()}`);
console.log('');

const scored = neighborhoods.map(t => ({ ...t, score: score(t) }));
scored.sort((a, b) => b.score.total - a.score.total);

const totalPop = scored.reduce((s, t) => s + t.population, 0);
const totalUnits = scored.reduce((s, t) => s + t.housing_units, 0);
const avgHomeValue = Math.round(scored.reduce((s, t) => s + t.med_home_value, 0) / scored.length);
const avgIncome = Math.round(scored.reduce((s, t) => s + t.med_income, 0) / scored.length);

console.log('┌────────────────────────────────────────────────────────────────────────────────────────────┐');
console.log('│  DISTRICT SUMMARY                                                                         │');
console.log('├────────────────────────────────────────────────────────────────────────────────────────────┤');
console.log(`│  Population:          ${totalPop.toLocaleString().padStart(8)}     Median Income:   $${avgIncome.toLocaleString().padStart(7)}                         │`);
console.log(`│  Housing Units:       ${totalUnits.toLocaleString().padStart(8)}     Avg Home Value:  $${avgHomeValue.toLocaleString().padStart(7)}                         │`);
console.log(`│  Neighborhoods:       ${scored.length.toString().padStart(8)}     Top Zone Score:  ${scored[0].score.total.toString().padStart(7)}                         │`);
console.log('└────────────────────────────────────────────────────────────────────────────────────────────┘');
console.log('');

console.log('  RANKED NEIGHBORHOODS');
console.log('  ' + '─'.repeat(90));
const header = '  ' +
  'Rank'.padEnd(6) +
  'Neighborhood'.padEnd(32) +
  'Score'.padStart(6) +
  'Pop.'.padStart(7) +
  'Med Value'.padStart(11) +
  'Med Inc.'.padStart(10) +
  'Owner%'.padStart(8) +
  'Senior%'.padStart(8);
console.log(header);
console.log('  ' + '─'.repeat(90));

scored.forEach((t, i) => {
  const s = t.score;
  const rank = `#${i + 1}`.padEnd(6);
  const name = t.name.padEnd(32);
  const sc = s.total.toFixed(1).padStart(6);
  const pop = t.population.toLocaleString().padStart(7);
  const val = `$${t.med_home_value.toLocaleString()}`.padStart(11);
  const inc = `$${t.med_income.toLocaleString()}`.padStart(10);
  const own = `${(s.owner_occ_rate * 100).toFixed(0)}%`.padStart(8);
  const sr = `${(t.pct_65 * 100).toFixed(0)}%`.padStart(8);

  console.log(`  ${rank}${name}${sc}${pop}${val}${inc}${own}${sr}`);
});

console.log('  ' + '─'.repeat(90));
console.log('');

// Insight summary
console.log('  KEY INSIGHTS FOR WESTERVILLE');
console.log('  ' + '─'.repeat(90));
console.log('');

const highPriority = scored.filter(t => t.score.total >= 55);
const seniorHeavy = scored.filter(t => t.pct_65 >= 0.16);
const midMarket = scored.filter(t => t.med_home_value >= 200000 && t.med_home_value <= 320000);

console.log(`  High-priority zones (score 55+):  ${highPriority.length} of ${scored.length} neighborhoods`);
console.log(`    → ${highPriority.map(t => t.name).join(', ')}`);
console.log('');
console.log(`  Senior-heavy zones (65+ > 16%):   ${seniorHeavy.length} neighborhoods`);
console.log(`    → ${seniorHeavy.map(t => `${t.name} (${(t.pct_65 * 100).toFixed(0)}%)`).join(', ')}`);
console.log('    Downsizing potential — these homeowners may be ready to sell.');
console.log('');
console.log(`  Mid-market sweet spot ($200-320K): ${midMarket.length} neighborhoods`);
console.log(`    → ${midMarket.map(t => `${t.name} ($${(t.med_home_value / 1000).toFixed(0)}K)`).join(', ')}`);
console.log('    Fits the core buyer pool in central Ohio.');
console.log('');

// Detail cards for top 3
console.log('  TOP 3 ZONE DETAILS');
console.log('');

scored.slice(0, 3).forEach((t, i) => {
  const s = t.score;
  const w = 85;
  console.log(`  ┌── #${i + 1} ${t.name} ${'─'.repeat(Math.max(0, w - 6 - t.name.length))}┐`);
  console.log(`  │  Score: ${s.total.toFixed(1).padEnd(w - 12)}│`);
  console.log(`  │  Pop: ${t.population.toLocaleString()}  Income: $${t.med_income.toLocaleString()}  Home Value: $${t.med_home_value.toLocaleString()}  Rent: $${t.med_rent.toLocaleString()}${''.padEnd(Math.max(0, w - 75))}│`);
  console.log(`  │  Housing: ${t.housing_units.toLocaleString()} units  Owner: ${(s.owner_occ_rate * 100).toFixed(0)}%  Vacancy: ${(s.vacancy_rate * 100).toFixed(1)}%  Built: ${t.year_built}  65+: ${(t.pct_65 * 100).toFixed(0)}%${''.padEnd(Math.max(0, w - 77))}│`);
  console.log(`  │  Why: ${s.reasons.join('; ').substring(0, w - 9).padEnd(w - 9)}│`);
  console.log(`  │  Recommended: ${(s.total >= 55 ? 'Monthly (door knock + mail piece)' : s.total >= 40 ? 'Quarterly (mail piece)' : 'Semi-annual (mail)').padEnd(w - 17)}│`);
  console.log(`  └${'─'.repeat(w)}┘`);
  console.log('');
});

console.log('  ' + '═'.repeat(90));
console.log('  HPI Trend: Columbus MSA — Up 5.2% YoY, Up 38.4% over 5 years');
console.log('  Westerville schools rated "Excellent" — strong demand floor for housing prices');
console.log('  ' + '═'.repeat(90));
