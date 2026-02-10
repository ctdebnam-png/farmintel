/**
 * Stub adapter — generates realistic fake Westerville listings
 * for development and CI testing. Swap for a real adapter in production.
 */
import type { ListingsAdapter, ListingItem, FetchListingsParams } from './types';

const STREETS = [
  'State St', 'Main St', 'Schrock Rd', 'Cleveland Ave', 'Africa Rd',
  'Polaris Pkwy', 'Sunbury Rd', 'Spring Rd', 'County Line Rd', 'Otterbein Ave',
  'Grove City Rd', 'Huber Village Blvd', 'Cooper Rd', 'Maxtown Rd', 'Dempsey Rd',
  'Heatherdown Dr', 'Brookside Dr', 'Walnut St', 'Park St', 'College Ave',
  'Home St', 'West Main St', 'East Broadway', 'Knox St', 'Vine St',
  'Oak St', 'Maple Dr', 'Cherry Way', 'Elm Ct', 'Lincoln Ave',
  'Liberty St', 'Heritage Dr', 'Creekside Ln', 'Meadow Run', 'Timber Creek Ct',
  'Fox Glen Dr', 'Windfield Pl', 'Stonegate Ct', 'Pinebrook Dr', 'Canterbury Ln',
  'Abington Rd', 'Bennington Ct', 'Chatham Pl', 'Devon Cir', 'Edgewater Dr',
  'Foxboro Ct', 'Greenfield Ave', 'Hampton Pl', 'Ivy Hill Ln', 'Jefferson St',
];

const ZIPS = ['43081', '43082'];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateListings(params: FetchListingsParams): ListingItem[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const rand = seededRandom(dayOfYear * 1000 + 42);

  const count = Math.min(params.limit, 50);
  const items: ListingItem[] = [];

  for (let i = 0; i < count; i++) {
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const num = 100 + Math.floor(rand() * 900);
    const zip = params.zips.length > 0
      ? params.zips[Math.floor(rand() * params.zips.length)]
      : ZIPS[Math.floor(rand() * ZIPS.length)];

    const basePrice = 180000 + Math.floor(rand() * 280000);
    const isNew = rand() < 0.3;
    const hadPriceChange = !isNew && rand() < 0.2;
    const previousPrice = hadPriceChange
      ? basePrice + Math.floor((rand() - 0.3) * 30000)
      : null;

    const statusRoll = rand();
    let status: ListingItem['status'];
    if (isNew) status = 'new';
    else if (hadPriceChange) status = 'price_change';
    else if (statusRoll < 0.6) status = 'active';
    else if (statusRoll < 0.8) status = 'pending';
    else status = 'sold';

    const dom = status === 'new' ? 0 : Math.floor(rand() * 90);
    const beds = 2 + Math.floor(rand() * 4);
    const baths = 1 + Math.floor(rand() * 3);
    const sqft = 1000 + Math.floor(rand() * 2500);

    const now = new Date();
    const hoursAgo = Math.floor(rand() * params.sinceHours);
    const changeTs = new Date(now.getTime() - hoursAgo * 3600000);

    items.push({
      id: `stub-${dayOfYear}-${i}`,
      address: `${num} ${street}`,
      city: params.city,
      zip,
      price: basePrice,
      beds,
      baths,
      sqft,
      status,
      daysOnMarket: dom,
      url: null,
      imageUrl: null,
      lastChangeTs: changeTs.toISOString(),
      isNew,
      hadPriceChange,
      previousPrice,
      lat: 40.1 + rand() * 0.05,
      lon: -82.93 + rand() * 0.05,
    });
  }

  return items.sort(
    (a, b) => new Date(b.lastChangeTs).getTime() - new Date(a.lastChangeTs).getTime()
  );
}

export const stubAdapter: ListingsAdapter = {
  name: 'stub',
  fetchListings: async (params) => generateListings(params),
};
