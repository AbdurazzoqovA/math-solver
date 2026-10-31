#!/usr/bin/env node
// Capture Google's public SEO contract, then compare Azure origin/public traffic.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const mode = process.argv[2];
assert.ok(['baseline', 'origin', 'public'].includes(mode));
const baselinePath = '.azure-migration/seo-before-cutover.json';
if (mode === 'baseline' && existsSync(baselinePath)) throw new Error('Refusing to overwrite SEO baseline');
const request = async url => {
  assert.equal(new URL(url).hostname.replace(/^www\./, ''), 'math-solver.io');
  const args = ['--silent', '--show-error', '--max-time', '45', '--include', '--write-out', '\n%{http_code}', '-H', 'Cache-Control: no-cache'];
  if (mode === 'origin') args.push('--resolve', `${new URL(url).hostname}:443:20.69.202.190`, '--cacert', '.azure-migration/cloudflare-origin-rsa-root.pem');
  const { stdout } = await exec('curl', [...args, url], { maxBuffer: 16 * 1024 * 1024 });
  const split = stdout.lastIndexOf('\n');
  const result = stdout.slice(0, split).replaceAll('\r\n', '\n');
  const boundary = result.indexOf('\n\n');
  const headers = result.slice(0, boundary);
  return { status: Number(stdout.slice(split + 1)), body: result.slice(boundary + 2), location: headers.match(/^location:\s*(.*)$/im)?.[1] || null, robotsHeader: headers.match(/^x-robots-tag:\s*(.*)$/im)?.[1] || null };
};
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
}
function contract(response) {
  const tags = [...response.body.matchAll(/<(?:meta|link)\s[^>]*>/g)].map(m => attributes(m[0]));
  return {
    status: response.status, location: response.location, robotsHeader: response.robotsHeader,
    title: response.body.match(/<title>([\s\S]*?)<\/title>/)?.[1] || null,
    canonical: tags.filter(t => t.rel === 'canonical').map(t => t.href),
    meta: tags.filter(t => ['description', 'robots', 'googlebot'].includes(t.name) || t.property === 'og:url'),
    headings: [...response.body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => m[1]),
    structuredData: [...response.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])),
  };
}
const sitemap = await request('https://math-solver.io/sitemap.xml');
assert.equal(sitemap.status, 200);
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).sort();
assert.ok(urls.length > 40 && urls.length < 300);
const baseline = mode === 'baseline' ? null : JSON.parse(readFileSync(baselinePath, 'utf8'));
const failures = [];
const acceptedDifferences = [];
if (baseline) {
  try { assert.deepEqual(urls, baseline.urls); assert.equal(sitemap.body, baseline.sitemap); }
  catch { failures.push({ url: '/sitemap.xml', issue: 'Sitemap changed' }); }
}
const pages = {};
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      pages[url] = contract(await request(url));
      assert.equal(pages[url].status, 200);
      if (baseline) assert.deepEqual(pages[url], baseline.pages[url]);
    } catch { failures.push({ url, issue: 'Status or SEO contract mismatch' }); }
  }
}));
const robots = await request('https://math-solver.io/robots.txt');
assert.equal(robots.status, 200);
const normalize = body => body.replace(/# BEGIN Cloudflare Managed content[\s\S]*?# END Cloudflare Managed content\s*/i, '').trim();
if (baseline && normalize(robots.body) !== normalize(baseline.robots)) failures.push({ url: '/robots.txt', issue: 'Crawler policy changed' });
const redirects = {};
// The public www redirect belongs to Cloudflare, not to the Azure origin.
if (mode !== 'origin') {
  for (const url of ['http://math-solver.io/', 'http://www.math-solver.io/calculator?migration=check', 'https://www.math-solver.io/calculator?migration=check']) {
    const response = await request(url);
    redirects[url] = { status: response.status, location: response.location };
  }
  if (baseline) {
    for (const [url, actual] of Object.entries(redirects)) {
      const expected = baseline.redirects[url];
      // Explicitly opt in only to ACA's observed HTTP upgrade status change.
      // Destinations, www behavior, and every other status remain strict.
      if (process.argv.includes('--allow-permanent-https') && url === 'http://math-solver.io/' && expected?.status === 302 && actual.status === 301 && actual.location === expected.location && actual.location === 'https://math-solver.io/') {
        acceptedDifferences.push({ url, from: 302, to: 301, location: actual.location, reason: 'Azure permanent HTTPS upgrade to unchanged canonical URL' });
        continue;
      }
      try { assert.deepEqual(actual, expected); }
      catch { failures.push({ url, issue: 'Redirect contract changed' }); }
    }
  }
}
const report = { at: new Date().toISOString(), mode, urlCount: urls.length, passed: failures.length === 0, failures, acceptedDifferences, urls, pages, sitemap: sitemap.body, robots: robots.body, redirects };
writeFileSync(mode === 'baseline' ? baselinePath : `.azure-migration/seo-${mode}-${Date.now()}.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ at: report.at, mode, urlCount: urls.length, passed: report.passed, failures, acceptedDifferences }));
process.exitCode = report.passed ? 0 : 1;
