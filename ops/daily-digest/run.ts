#!/usr/bin/env npx tsx
/**
 * FarmIntel Daily Digest — Main Pipeline
 *
 * Usage:
 *   npx tsx ops/daily-digest/run.ts                # generate + email
 *   npx tsx ops/daily-digest/run.ts --no-email     # generate only (local dev)
 *   npx tsx ops/daily-digest/run.ts --no-png       # skip PNG render (no Playwright)
 *
 * Outputs: ops/daily-digest/output/digest.json, digest.html, digest.png
 */
import * as fs from 'fs';
import * as path from 'path';

import { stubAdapter } from './adapters/stub';
import type { ListingsAdapter } from './adapters/types';
import { computeStats } from './stats/compute';
import { renderDigestHTML } from './render/template';
import { sendDigestEmail } from './send-email';

const OUT_DIR = path.join(__dirname, 'output');

// Config — edit these for your market
const CONFIG = {
  city: 'Westerville',
  zips: ['43081', '43082'],
  limit: 50,
  sinceHours: 24,
};

function selectAdapter(): ListingsAdapter {
  // When a real adapter is wired up, check an env var or config flag here:
  // if (process.env.LISTINGS_ADAPTER === 'realtor') return realtorAdapter;
  return stubAdapter;
}

async function main() {
  const args = process.argv.slice(2);
  const skipEmail = args.includes('--no-email');
  const skipPng = args.includes('--no-png');

  console.log('=== FarmIntel Daily Digest ===');
  console.log(`Market: ${CONFIG.city}, OH (${CONFIG.zips.join(', ')})`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  // 1. Fetch listings
  const adapter = selectAdapter();
  console.log(`Adapter: ${adapter.name}`);
  const listings = await adapter.fetchListings(CONFIG);
  console.log(`Fetched ${listings.length} listings`);

  // 2. Compute stats
  const stats = computeStats(listings);
  console.log(`Stats: median ${stats.medianPrice}, ${stats.newListings} new, ${stats.priceChanges} price changes`);

  // 3. Render HTML
  const html = renderDigestHTML(listings, stats);

  // 4. Write outputs
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = path.join(OUT_DIR, 'digest.json');
  const htmlPath = path.join(OUT_DIR, 'digest.html');
  const pngPath = path.join(OUT_DIR, 'digest.png');

  fs.writeFileSync(jsonPath, JSON.stringify({ stats, listings }, null, 2));
  fs.writeFileSync(htmlPath, html);
  console.log(`Wrote: ${jsonPath}`);
  console.log(`Wrote: ${htmlPath}`);

  // 5. Render PNG (optional — needs Playwright)
  if (!skipPng) {
    try {
      const { htmlToPng } = await import('./render/to-png');
      await htmlToPng(html, pngPath, { width: 1200, deviceScaleFactor: 2 });
      console.log(`Wrote: ${pngPath}`);
    } catch (err: any) {
      console.warn(`PNG render skipped: ${err.message}`);
      console.warn('Run "npx playwright install chromium" to enable PNG output.');
    }
  } else {
    console.log('PNG render skipped (--no-png)');
  }

  // 6. Send email (optional)
  if (!skipEmail && process.env.SENDGRID_API_KEY) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const subject = `FarmIntel Digest — Westerville — ${dateStr}`;

    const emailHtml = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1e3a5f">FarmIntel Daily Digest</h2>
        <p>Westerville, OH — ${stats.dateLabel}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0"><strong>${stats.totalListings}</strong> Total</td>
            <td style="padding:8px;border:1px solid #e2e8f0"><strong>${stats.newListings}</strong> New</td>
            <td style="padding:8px;border:1px solid #e2e8f0"><strong>${stats.priceChanges}</strong> Price Changes</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0">Median: <strong>$${stats.medianPrice.toLocaleString()}</strong></td>
            <td style="padding:8px;border:1px solid #e2e8f0">DOM: <strong>${stats.medianDom ?? 'N/A'}</strong></td>
            <td style="padding:8px;border:1px solid #e2e8f0">$/sqft: <strong>${stats.avgPricePerSqft ? `$${stats.avgPricePerSqft}` : 'N/A'}</strong></td>
          </tr>
        </table>
        <p style="color:#64748b;font-size:13px">Full digest PNG is attached. Open on any device for the complete 50-card view.</p>
        <p style="color:#94a3b8;font-size:11px;margin-top:24px">FarmIntel — TD Realty Ohio</p>
      </div>
    `;

    if (fs.existsSync(pngPath)) {
      await sendDigestEmail({ subject, htmlBody: emailHtml, pngPath });
    } else {
      console.warn('No PNG file found — email skipped. Run without --no-png first.');
    }
  } else if (!skipEmail) {
    console.log('Email skipped (no SENDGRID_API_KEY set)');
  } else {
    console.log('Email skipped (--no-email)');
  }

  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Digest pipeline failed:', err);
  process.exit(1);
});
