/**
 * Compute summary statistics from a set of listings.
 */
import type { ListingItem } from '../adapters/types';

export interface DigestStats {
  totalListings: number;
  newListings: number;
  priceChanges: number;
  pending: number;
  sold: number;
  medianPrice: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianSqft: number | null;
  medianDom: number | null;
  avgPricePerSqft: number | null;
  zipBreakdown: Record<string, { count: number; medianPrice: number }>;
  dateLabel: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeStats(listings: ListingItem[]): DigestStats {
  const prices = listings.map((l) => l.price);
  const sqfts = listings.map((l) => l.sqft).filter((s): s is number => s !== null);
  const doms = listings.map((l) => l.daysOnMarket).filter((d): d is number => d !== null);

  const pricesWithSqft = listings.filter((l) => l.sqft && l.sqft > 0);
  const avgPricePerSqft =
    pricesWithSqft.length > 0
      ? Math.round(
          pricesWithSqft.reduce((s, l) => s + l.price / l.sqft!, 0) /
            pricesWithSqft.length
        )
      : null;

  // Breakdown by zip
  const byZip = new Map<string, number[]>();
  listings.forEach((l) => {
    const arr = byZip.get(l.zip) ?? [];
    arr.push(l.price);
    byZip.set(l.zip, arr);
  });

  const zipBreakdown: Record<string, { count: number; medianPrice: number }> = {};
  byZip.forEach((zipPrices, zip) => {
    zipBreakdown[zip] = {
      count: zipPrices.length,
      medianPrice: median(zipPrices),
    };
  });

  return {
    totalListings: listings.length,
    newListings: listings.filter((l) => l.isNew).length,
    priceChanges: listings.filter((l) => l.hadPriceChange).length,
    pending: listings.filter((l) => l.status === 'pending').length,
    sold: listings.filter((l) => l.status === 'sold').length,
    medianPrice: median(prices),
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    medianSqft: sqfts.length > 0 ? median(sqfts) : null,
    medianDom: doms.length > 0 ? median(doms) : null,
    avgPricePerSqft,
    zipBreakdown,
    dateLabel: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}
