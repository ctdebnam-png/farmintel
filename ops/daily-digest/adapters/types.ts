/**
 * Daily Digest — Provider Adapter Interface
 *
 * Every data source (Realtor.com RapidAPI, ATTOM, manual CSV, etc.)
 * implements this interface so the digest pipeline stays source-agnostic.
 */

export interface ListingItem {
  id: string;
  address: string;
  city: string;
  zip: string;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: 'active' | 'pending' | 'sold' | 'price_change' | 'new';
  daysOnMarket: number | null;
  url: string | null;
  imageUrl: string | null;
  lastChangeTs: string; // ISO 8601
  isNew: boolean;
  hadPriceChange: boolean;
  previousPrice: number | null;
  lat: number | null;
  lon: number | null;
}

export interface FetchListingsParams {
  city: string;
  zips: string[];
  limit: number;
  sinceHours: number;
}

export interface ListingsAdapter {
  name: string;
  fetchListings(params: FetchListingsParams): Promise<ListingItem[]>;
}
