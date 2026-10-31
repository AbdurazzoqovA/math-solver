#!/usr/bin/env node
// Check crawlable language pages from raw HTTP responses, before hydration.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parse, parseFragment } from 'parse5';
import { LANGUAGES } from '../src/lib/i18n/locales.ts';
import { SITE_URL, languageAlternates, localeHome } from '../src/lib/i18n/paths.ts';
import { translate } from '../src/lib/i18n/messages.ts';
import { aiDetectorLink } from '../src/lib/i18n/external-links.ts';

const usage = 'Usage: node scripts/check-web-language-seo.mjs BASE_URL [--baseline=PATH] [--report=PATH]';
const args = process.argv.slice(2);
if (args.includes('--help') || args.length === 0) {
  console.log(usage);
  process.exit(args.includes('--help') ? 0 : 1);
}
const [baseArgument, ...options] = args;
const unknown = options.filter(value => !/^--(?:baseline|report)=.+$/.test(value));
assert.equal(unknown.length, 0, usage);
const base = new URL(baseArgument);
assert.ok(['http:', 'https:'].includes(base.protocol), 'BASE_URL must use HTTP or HTTPS');
assert.ok(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash, 'BASE_URL must contain only an origin');
const baselinePath = options.find(value => value.startsWith('--baseline='))?.slice('--baseline='.length);
const reportPath = options.find(value => value.startsWith('--report='))?.slice('--report='.length);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The application uses TypeScript aliases and bundled JSON imports. Resolve
// those in Node without loading Next.js or changing the application source.
registerHooks({
  resolve(specifier, context, nextResolve) {
    let path;
    if (specifier.startsWith('@/')) path = resolve(repo, 'src', specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      path = fileURLToPath(new URL(specifier, context.parentURL));
    }
    if (path && !extname(path)) {
      path = ['.ts', '.tsx', '.js'].map(extension => path + extension).find(existsSync) ?? path;
    }
    if (path && existsSync(path)) return nextResolve(pathToFileURL(path).href, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { openGraphLocales, homeStructuredData } = await import('../src/lib/i18n/seo.ts');
const { calculatorDefinitions } = await import('../src/lib/calculators.ts');
const copy = Object.fromEntries(LANGUAGES.map(({ code }) => [code, JSON.parse(readFileSync(resolve(repo, 'src/lib/i18n/landing', `${code}.json`), 'utf8'))]));
const baseline = baselinePath ? JSON.parse(readFileSync(resolve(baselinePath), 'utf8')) : null;
const alternates = languageAlternates();
const failures = [];
const checks = [];
const cache = new Map();
const normalize = text => text.replace(/\s+/gu, ' ').trim();
const hasOneDocumentRoot = body => (body.match(/<html(?=[\s>])/gi) ?? []).length === 1 && (body.match(/<body(?=[\s>])/gi) ?? []).length === 1;

function walk(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  for (const child of node.childNodes ?? []) walk(child, predicate, result);
  return result;
}
const elements = (node, name) => walk(node, value => value.tagName === name);
const attributes = node => Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
function textContent(node, visible = false) {
  if (node.nodeName === '#text') return node.value;
  if (visible && ['script', 'style', 'template'].includes(node.tagName)) return '';
  return (node.childNodes ?? []).map(child => textContent(child, visible)).join(' ');
}
const decode = value => value === null ? null : normalize(textContent(parseFragment(String(value))));
const metadataNodes = document => walk(document, node => node.tagName === 'meta' || node.tagName === 'link');
function metaValues(document, name, property = false) {
  return elements(document, 'meta').map(attributes).filter(attrs => attrs[property ? 'property' : 'name'] === name).map(attrs => attrs.content);
}
function jsonLd(document) {
  return elements(document, 'script').filter(node => attributes(node).type === 'application/ld+json').map(node => JSON.parse((node.childNodes ?? []).map(child => textContent(child)).join('')));
}
function schemaObjects(value, result = []) {
  if (Array.isArray(value)) value.forEach(item => schemaObjects(item, result));
  else if (value && typeof value === 'object') {
    if (value['@type']) result.push(value);
    Object.values(value).forEach(item => schemaObjects(item, result));
  }
  return result;
}
const hasType = (object, type) => [object['@type']].flat().includes(type);
function check(path, name, passed) {
  checks.push({ path, check: name, passed: Boolean(passed) });
  if (!passed) failures.push({ path, check: name });
}
async function task(path, name, action) {
  try { await action(); }
  catch (error) {
    check(path, name, false);
    failures[failures.length - 1].error = error?.name ?? 'Error';
  }
}
async function request(path, init = {}) {
  const key = `${init.method ?? 'GET'} ${path}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetch(new URL(path, base), {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
      headers: { 'Cache-Control': 'no-cache', ...init.headers },
    });
    const body = await response.text();
    return { status: response.status, location: response.headers.get('location'), robotsHeader: response.headers.get('x-robots-tag'), contentType: response.headers.get('content-type') ?? '', body };
  })());
  return cache.get(key);
}
async function parallel(items, action) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (cursor < items.length) await action(items[cursor++]);
  }));
}
const productionUrl = path => SITE_URL + (path === '/' ? '' : path);
function canonicalValues(document) {
  return elements(document, 'link').map(attributes).filter(attrs => attrs.rel === 'canonical').map(attrs => attrs.href);
}
function alternateValues(document, sitemap = false) {
  const links = elements(document, sitemap ? 'xhtml:link' : 'link').map(attributes).filter(attrs => attrs.rel === 'alternate' && attrs.hreflang);
  return links.map(({ hreflang, href }) => [hreflang, href]).sort(([a], [b]) => a.localeCompare(b));
}
const expectedAlternates = Object.entries(alternates).sort(([a], [b]) => a.localeCompare(b));

await parallel(LANGUAGES, async ({ code, dir }) => {
  const path = localeHome(code);
  await task(path, 'homepage-response', async () => {
    const response = await request(path);
    check(path, 'status-200-without-redirect', response.status === 200 && response.location === null);
    check(path, 'one-raw-html-and-body', hasOneDocumentRoot(response.body));
    const document = parse(response.body);
    const html = attributes(elements(document, 'html')[0]);
    const body = elements(document, 'body')[0];
    const visible = normalize(textContent(body, true));
    const landing = copy[code];
    check(path, 'html-language-and-direction', html.lang === code && html.dir === dir);
    check(path, 'one-localized-h1', isDeepStrictEqual(elements(document, 'h1').map(node => normalize(textContent(node, true))), [normalize(translate(code, 'heroTitle'))]));
    check(path, 'title', isDeepStrictEqual(elements(document, 'title').map(node => normalize(textContent(node))), [normalize(landing.metaTitle)]));
    check(path, 'description', isDeepStrictEqual(metaValues(document, 'description'), [landing.metaDescription]));
    check(path, 'self-canonical', isDeepStrictEqual(canonicalValues(document), [productionUrl(path)]));
    check(path, 'reciprocal-language-alternates', isDeepStrictEqual(alternateValues(document), expectedAlternates));
    check(path, 'indexable', !/noindex/i.test(response.robotsHeader ?? '') && !metaValues(document, 'robots').some(value => /noindex/i.test(value)));
    const socialExpected = {
      'og:title': landing.socialTitle,
      'og:description': landing.metaDescription,
      'og:url': productionUrl(path),
      'og:locale': openGraphLocales[code],
      'og:image': `${SITE_URL}/math-solver-og.png`,
      'og:image:alt': landing.imageAlt,
    };
    for (const [key, value] of Object.entries(socialExpected)) check(path, key, isDeepStrictEqual(metaValues(document, key, true), [value]));
    const twitterExpected = {
      'twitter:card': 'summary_large_image',
      'twitter:title': landing.socialTitle,
      'twitter:description': landing.metaDescription,
      'twitter:image': `${SITE_URL}/math-solver-og.png`,
      'twitter:image:alt': landing.imageAlt,
    };
    for (const [key, value] of Object.entries(twitterExpected)) check(path, key, isDeepStrictEqual(metaValues(document, key), [value]));
    const prose = [
      landing.introTitle, ...landing.introParagraphs, landing.calculatorsTitle, landing.calculatorsDescription, landing.browseCalculators,
      ...landing.popularCalculators.flatMap(item => [item.name, item.detail]),
      landing.mobileTag, landing.mobileTitle, landing.mobileDescription, ...landing.mobileFeatures,
      landing.featuresTitle, ...landing.featureCards.flatMap(item => [item.title, item.description]),
      landing.howTitle, ...landing.howSteps.flatMap(item => [item.title, item.description]),
      landing.subjectsTitle, ...landing.subjectsParagraphs, landing.faqTitle,
      landing.detectorLanguageNote,
      ...landing.faqs.flatMap(item => [item.question, normalize([item.answer, item.linkText, item.afterLink].filter(Boolean).join(' '))]),
      landing.copyright, ...(code === 'en' ? [] : [landing.englishGuidesNote]),
    ];
    const missingCopy = prose.flatMap((value, index) => visible.includes(normalize(value)) ? [] : [index]);
    check(path, 'complete-localized-visible-copy', missingCopy.length === 0);
    if (missingCopy.length > 0) failures[failures.length - 1].missingCopyIndexes = missingCopy;
    check(path, 'localized-preview-image-alt', elements(document, 'img').some(node => attributes(node).alt === landing.mobilePreviewAlt));
    const anchors = elements(body, 'a');
    const detector = aiDetectorLink(code);
    const detectorAnchors = anchors.filter(node => attributes(node).href?.startsWith('https://detecting-ai.com/'));
    check(path, 'localized-detector-link-or-root-fallback', detectorAnchors.length === 1 && attributes(detectorAnchors[0]).href === detector.href && attributes(detectorAnchors[0]).hreflang === detector.hrefLang && normalize(textContent(detectorAnchors[0], true)) === landing.faqs.find(item => item.linkText)?.linkText);
    check(path, 'native-language-home-links', LANGUAGES.every(language => anchors.some(node => {
      const href = attributes(node).href;
      if (!href || normalize(textContent(node, true)) !== language.nativeName) return false;
      const target = new URL(href, base);
      return [base.origin, SITE_URL].includes(target.origin) && target.pathname === localeHome(language.code) && !target.search && !target.hash;
    })));
    const schemas = jsonLd(document);
    const objects = schemaObjects(schemas);
    const expectedObjects = schemaObjects(homeStructuredData(code));
    for (const type of ['WebPage', 'WebApplication']) {
      const expected = expectedObjects.find(object => hasType(object, type));
      const actual = objects.filter(object => hasType(object, type));
      check(path, `${type}-localized-schema`, Boolean(expected) && actual.length === 1 && isDeepStrictEqual(actual[0], expected) && actual[0].url === productionUrl(path) && actual[0].inLanguage === code && Boolean(actual[0].name) && actual[0].description === landing.metaDescription);
    }
    check(path, 'no-FAQPage-schema', !objects.some(object => hasType(object, 'FAQPage')));
    if (baseline && code === 'en') {
      const original = baseline.pages[SITE_URL] ?? baseline.pages[SITE_URL + '/'];
      check(path, 'original-English-title-description-h1', Boolean(original) && decode(original.title) === normalize(landing.metaTitle) && isDeepStrictEqual(original.headings.map(decode), [normalize(translate(code, 'heroTitle'))]) && original.meta.find(meta => meta.name === 'description')?.content === landing.metaDescription);
    }
  });
});

let sitemapUrls = [];
await task('/sitemap.xml', 'sitemap-response', async () => {
  const response = await request('/sitemap.xml');
  check('/sitemap.xml', 'status-200', response.status === 200 && response.location === null);
  const document = parse(response.body);
  const entries = elements(document, 'url').map(node => ({ url: normalize(textContent(elements(node, 'loc')[0])), alternates: alternateValues(node, true) }));
  sitemapUrls = entries.map(entry => entry.url);
  check('/sitemap.xml', 'unique-URLs', new Set(sitemapUrls).size === sitemapUrls.length);
  check('/sitemap.xml', 'all-16-language-homes', LANGUAGES.every(({ code }) => entries.some(entry => entry.url === productionUrl(localeHome(code)) && isDeepStrictEqual(entry.alternates, expectedAlternates))));
  check('/sitemap.xml', 'no-internal-English-prefix', sitemapUrls.every(url => !/^\/en(?:\/|$)/.test(new URL(url).pathname)));
  const existing = [
    '/calculator', '/blog', '/privacy', '/terms', '/contact', '/account-deletion',
    ...calculatorDefinitions.map(({ slug }) => `/calculator/${slug}`),
  ];
  check('/sitemap.xml', 'existing-English-routes-preserved', existing.every(path => sitemapUrls.includes(productionUrl(path))));
  if (baseline) check('/sitemap.xml', 'all-original-indexed-URLs-preserved', baseline.urls.every(url => sitemapUrls.includes(url)));
});

function oldContract(response, document) {
  const tags = metadataNodes(document).map(attributes);
  return {
    status: response.status,
    location: response.location,
    robotsHeader: response.robotsHeader,
    title: elements(document, 'title')[0] ? normalize(textContent(elements(document, 'title')[0])) : null,
    canonical: canonicalValues(document),
    meta: tags.filter(tag => ['description', 'robots', 'googlebot'].includes(tag.name) || tag.property === 'og:url'),
    headings: elements(document, 'h1').map(node => normalize(textContent(node))),
    structuredData: jsonLd(document),
  };
}
function normalizeOriginal(contract) {
  return {
    ...contract,
    title: decode(contract.title),
    canonical: contract.canonical.map(decode),
    meta: contract.meta.map(tag => Object.fromEntries(Object.entries(tag).map(([key, value]) => [key, decode(value)]))),
    headings: contract.headings.map(decode),
  };
}
let originalPageCount = 0;
if (baseline) {
  const nonhome = baseline.urls.filter(url => new URL(url).pathname !== '/');
  originalPageCount = nonhome.length;
  await parallel(nonhome, async url => {
    const path = new URL(url).pathname;
    await task(path, 'original-English-page-response', async () => {
      const response = await request(path);
      const actual = oldContract(response, parse(response.body));
      const expected = normalizeOriginal(baseline.pages[url]);
      for (const field of ['status', 'location', 'robotsHeader', 'title', 'canonical', 'meta', 'headings', 'structuredData']) {
        check(path, `original-English-${field}`, isDeepStrictEqual(actual[field], expected[field]));
      }
    });
  });
}

await task('/en', 'English-alias-redirect', async () => {
  const response = await request('/en?languageSeoCheck=1');
  const location = response.location ? new URL(response.location, base) : null;
  check('/en', 'permanent-root-redirect-preserves-query', response.status === 308 && location?.origin === base.origin && location.pathname === '/' && location.search === '?languageSeoCheck=1');
});
await task('/en/calculator', 'English-subpage-alias-redirect', async () => {
  const response = await request('/en/calculator?languageSeoCheck=1');
  const location = response.location ? new URL(response.location, base) : null;
  check('/en/calculator', 'permanent-subpage-redirect-preserves-query', response.status === 308 && location?.origin === base.origin && location.pathname === '/calculator' && location.search === '?languageSeoCheck=1');
});
await parallel(['/zz', '/es/calculator'], async path => task(path, 'not-found-response', async () => {
  const response = await request(path);
  check(path, 'real-404', response.status === 404 && response.location === null);
  check(path, 'one-raw-html-and-body', hasOneDocumentRoot(response.body));
  const document = parse(response.body);
  check(path, 'not-found-noindex', /noindex/i.test(response.robotsHeader ?? '') || metaValues(document, 'robots').some(value => /noindex/i.test(value)));
}));
await parallel(['/api/solve', '/api/practice', '/api/practice/steps', '/api/ocr'], async path => task(path, 'API-routing', async () => {
  const response = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check(path, 'JSON-validation-gate-without-redirect', [400, 403, 429].includes(response.status) && response.location === null && response.contentType.includes('application/json'));
}));
await parallel(['/icons8-math-40.png', '/math-solver-og.png', '/mobile-app-preview.webp', '/icon.png', '/apple-icon.png'], async path => task(path, 'public-asset-routing', async () => {
  const response = await request(path);
  check(path, 'image-200-without-redirect', response.status === 200 && response.location === null && response.contentType.startsWith('image/') && response.body.length > 100);
}));
await task('/robots.txt', 'robots-routing', async () => {
  const response = await request('/robots.txt');
  check('/robots.txt', 'public-robots-and-sitemap', response.status === 200 && response.location === null && response.body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});
await parallel(['/calculator', '/calculator/solve-for-x'], async path => task(path, 'calculator-generated-image-routing', async () => {
  const response = await request(path);
  check(path, 'English-calculator-still-200', response.status === 200 && response.location === null);
  const document = parse(response.body);
  check(path, 'English-calculator-html-language', attributes(elements(document, 'html')[0]).lang === 'en');
  const imageUrls = metaValues(document, 'og:image', true);
  check(path, 'calculator-has-OG-image', imageUrls.length > 0);
  for (const url of imageUrls) {
    const target = new URL(url, base);
    if (![SITE_URL, base.origin].includes(target.origin)) continue;
    const imagePath = target.pathname + target.search;
    const image = await request(imagePath);
    check(imagePath, 'generated-image-200-without-redirect', image.status === 200 && image.location === null && image.contentType.startsWith('image/') && image.body.length > 100);
  }
  const directPath = `${path}/opengraph-image`;
  const direct = await request(directPath);
  check(directPath, 'generated-image-route-200-without-redirect', direct.status === 200 && direct.location === null && direct.contentType.startsWith('image/'));
}));

const report = {
  at: new Date().toISOString(), baseUrl: base.origin,
  passed: failures.length === 0,
  localesChecked: LANGUAGES.length,
  originalPagesChecked: originalPageCount,
  sitemapUrlCount: sitemapUrls.length,
  checkCount: checks.length,
  passedCheckCount: checks.filter(check => check.passed).length,
  failures,
  checks,
};
if (reportPath) writeFileSync(resolve(reportPath), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ ...report, failureCount: failures.length, failures: failures.slice(0, 20), checks: undefined }));
process.exitCode = report.passed ? 0 : 1;
