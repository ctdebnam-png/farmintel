/**
 * Render the daily digest as an HTML string.
 *
 * Layout:
 *   - Header bar with title + date
 *   - Stats strip (6 key metrics)
 *   - 50-card grid (5 columns x 10 rows on desktop, responsive)
 *   - Footer with branding
 */
import type { ListingItem } from '../adapters/types';
import type { DigestStats } from '../stats/compute';

function formatPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

function statusBadge(item: ListingItem): string {
  const colors: Record<string, string> = {
    new: 'background:#22c55e;color:#fff',
    price_change: 'background:#f59e0b;color:#fff',
    pending: 'background:#3b82f6;color:#fff',
    sold: 'background:#ef4444;color:#fff',
    active: 'background:#e5e7eb;color:#374151',
  };
  const labels: Record<string, string> = {
    new: 'NEW',
    price_change: 'PRICE CHG',
    pending: 'PENDING',
    sold: 'SOLD',
    active: 'ACTIVE',
  };
  const style = colors[item.status] || colors.active;
  const label = labels[item.status] || item.status.toUpperCase();
  return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;${style}">${label}</span>`;
}

function listingCard(item: ListingItem, index: number): string {
  const priceStr = formatPrice(item.price);
  const prevStr = item.previousPrice ? ` <s style="color:#9ca3af;font-size:11px">${formatPrice(item.previousPrice)}</s>` : '';
  const details = [
    item.beds !== null ? `${item.beds}bd` : null,
    item.baths !== null ? `${item.baths}ba` : null,
    item.sqft !== null ? `${item.sqft.toLocaleString()}sf` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const domStr = item.daysOnMarket !== null ? `${item.daysOnMarket}d` : '';

  return `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.3">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="font-weight:700;font-size:14px;color:#111">${priceStr}</span>
        ${statusBadge(item)}
      </div>
      ${prevStr ? `<div style="margin-bottom:2px">${prevStr}</div>` : ''}
      <div style="color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${item.address}">${item.address}</div>
      <div style="color:#6b7280;font-size:11px">${item.city}, ${item.zip}</div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;color:#6b7280;font-size:11px">
        <span>${details}</span>
        <span>${domStr}</span>
      </div>
    </div>`;
}

function statBox(label: string, value: string, accent = false): string {
  const bg = accent ? 'background:#1e40af;color:#fff' : 'background:#f1f5f9;color:#1e293b';
  return `
    <div style="flex:1;text-align:center;padding:10px 8px;border-radius:6px;${bg}">
      <div style="font-size:20px;font-weight:800;line-height:1.2">${value}</div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.8;margin-top:2px">${label}</div>
    </div>`;
}

export function renderDigestHTML(
  listings: ListingItem[],
  stats: DigestStats
): string {
  const zipSummary = Object.entries(stats.zipBreakdown)
    .map(([zip, data]) => `${zip}: ${data.count} listings, median ${formatPrice(data.medianPrice)}`)
    .join(' | ');

  const cards = listings.slice(0, 50).map((item, i) => listingCard(item, i)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FarmIntel Daily Digest — Westerville</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div style="max-width:1200px;margin:0 auto;padding:16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">FARMINTEL DAILY DIGEST</div>
          <div style="font-size:14px;opacity:0.85;margin-top:2px">Westerville, OH — Top 50 Listings</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:600">${stats.dateLabel}</div>
          <div style="font-size:11px;opacity:0.7">TD Realty Ohio</div>
        </div>
      </div>
    </div>

    <!-- Stats Strip -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${statBox('Total', String(stats.totalListings), true)}
      ${statBox('New', String(stats.newListings))}
      ${statBox('Price Changes', String(stats.priceChanges))}
      ${statBox('Median Price', formatPrice(stats.medianPrice), true)}
      ${statBox('Median DOM', stats.medianDom !== null ? `${stats.medianDom}d` : 'N/A')}
      ${statBox('$/sqft', stats.avgPricePerSqft !== null ? `$${stats.avgPricePerSqft}` : 'N/A')}
    </div>

    <!-- Zip Breakdown -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#64748b">
      ${zipSummary}
    </div>

    <!-- 50-Card Grid -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      ${cards}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:16px;padding:12px;font-size:11px;color:#94a3b8">
      FarmIntel — Area Farming Intelligence &middot; TD Realty Ohio &middot; Data from public sources
    </div>

  </div>
</body>
</html>`;
}
