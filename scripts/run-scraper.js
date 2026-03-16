#!/usr/bin/env node
'use strict';

/**
 * run-scraper.js
 * Standalone script used by the GitHub Actions "Live Scraper" workflow.
 * Reads configuration from environment variables and writes results to scrape-results.json.
 */

const { scraperService } = require('../backend/dist/services/scraper');
const fs = require('fs');

const rawUrls = process.env.SCRAPE_URL || 'https://example.com';
const location = process.env.SCRAPE_LOCATION || '';
const subject  = process.env.SCRAPE_SUBJECT  || '';
const extractKeys = process.env.EXTRACT_KEYS === 'true';

const urls = rawUrls.split(',').map((u) => u.trim()).filter(Boolean);

if (urls.length === 0) {
  console.error('No URLs provided. Set SCRAPE_URL environment variable.');
  process.exit(1);
}

(async () => {
  const results = [];

  for (const url of urls) {
    try {
      console.log(`Scraping: ${url}`);
      const result = await scraperService.scrapeUrl(url);
      results.push({
        url,
        success: true,
        title: result.title,
        description: result.description,
        linksCount: result.links.length,
        textSnippet: result.text.substring(0, 500),
        statusCode: result.statusCode,
        responseTime: result.responseTime,
      });
      console.log(`✓ Done: ${url} — "${result.title}" (${result.statusCode}, ${result.responseTime}ms)`);
    } catch (err) {
      results.push({ url, success: false, error: err.message });
      console.error(`✗ Failed: ${url} — ${err.message}`);
    }
  }

  const output = {
    runAt: new Date().toISOString(),
    location,
    subject,
    extractKeys,
    totalUrls: urls.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };

  const outPath = process.env.RESULTS_FILE || 'scrape-results.json';
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${outPath}`);
  console.log(`Summary: ${output.successful}/${output.totalUrls} URLs scraped successfully`);

  if (output.failed > 0) {
    process.exit(1);
  }
})().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
