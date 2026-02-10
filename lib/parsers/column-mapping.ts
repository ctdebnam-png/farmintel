/**
 * Configurable column mapping for county CSV exports.
 * Each county can have a JSON config that maps its column names to our standard fields.
 * The default mapping handles common column name patterns.
 */

export interface ColumnMapping {
  [standardField: string]: string[];  // array of possible column names
}

export const DEFAULT_PARCEL_MAPPING: ColumnMapping = {
  parcel_id: ['parcel_id', 'parcel_number', 'parcel_no', 'parcel', 'pin', 'apn', 'parcel id', 'parcel number'],
  situs_address: ['situs_address', 'situs_addr', 'property_address', 'site_address', 'address', 'property address', 'site address', 'situs address'],
  city: ['city', 'situs_city', 'property_city', 'site_city', 'situs city'],
  state: ['state', 'situs_state', 'property_state', 'situs state'],
  zip: ['zip', 'zip_code', 'situs_zip', 'property_zip', 'zipcode', 'zip code', 'situs zip'],
  owner_name: ['owner_name', 'owner', 'owner_1', 'owner1', 'property_owner', 'owner name'],
  mailing_address: ['mailing_address', 'mail_address', 'mail_addr', 'mailing address', 'mail address'],
  mailing_city: ['mailing_city', 'mail_city', 'mailing city', 'mail city'],
  mailing_state: ['mailing_state', 'mail_state', 'mailing state', 'mail state'],
  mailing_zip: ['mailing_zip', 'mail_zip', 'mailing_zipcode', 'mailing zip', 'mail zip'],
  land_use: ['land_use', 'land_use_code', 'use_code', 'property_class', 'land use', 'use code'],
  year_built: ['year_built', 'yr_built', 'year built', 'yr built'],
  assessed_value: ['assessed_value', 'total_assessed', 'assessed_total', 'assessed value', 'total assessed'],
  last_sale_date: ['last_sale_date', 'sale_date', 'last_transfer_date', 'transfer_date', 'last sale date', 'sale date'],
  last_sale_price: ['last_sale_price', 'sale_price', 'sale_amount', 'last_sale_amount', 'last sale price', 'sale price'],
  lat: ['lat', 'latitude', 'y'],
  lon: ['lon', 'lng', 'longitude', 'long', 'x'],
  zone_id_manual: ['zone_id', 'zone', 'block_group', 'tract', 'census_tract', 'neighborhood', 'block group', 'census tract'],
};

export const DEFAULT_TRANSFER_MAPPING: ColumnMapping = {
  parcel_id: ['parcel_id', 'parcel_number', 'parcel_no', 'parcel', 'pin', 'apn', 'parcel id'],
  sale_date: ['sale_date', 'transfer_date', 'date', 'recorded_date', 'sale date', 'transfer date'],
  sale_price: ['sale_price', 'price', 'amount', 'sale_amount', 'consideration', 'sale price'],
  deed_type: ['deed_type', 'instrument_type', 'deed', 'type', 'deed type'],
  recorded_date: ['recorded_date', 'recording_date', 'record_date', 'recorded date'],
};

/**
 * Given a header row and a column mapping, find the best match for each standard field.
 */
export function resolveMapping(
  headers: string[],
  mapping: ColumnMapping
): Record<string, number> {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const result: Record<string, number> = {};

  for (const [field, candidates] of Object.entries(mapping)) {
    for (const candidate of candidates) {
      const idx = normalized.indexOf(candidate.toLowerCase());
      if (idx !== -1) {
        result[field] = idx;
        break;
      }
    }
  }

  return result;
}
