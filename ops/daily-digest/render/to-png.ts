/**
 * Render HTML string to a PNG image using Playwright.
 *
 * Install: npx playwright install chromium
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export async function htmlToPng(
  html: string,
  outPath: string,
  opts: { width?: number; deviceScaleFactor?: number } = {}
): Promise<string> {
  const width = opts.width ?? 1200;
  const scale = opts.deviceScaleFactor ?? 2; // retina for mobile readability

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width, height: 800 },
      deviceScaleFactor: scale,
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    // Let the browser compute full height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width, height: bodyHeight });

    await page.screenshot({
      path: outPath,
      fullPage: true,
      type: 'png',
    });

    return outPath;
  } finally {
    await browser.close();
  }
}
