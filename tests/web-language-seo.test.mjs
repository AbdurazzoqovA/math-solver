import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LANGUAGES } from '../src/lib/i18n/locales.ts';
import { languageAlternates, languageHref, languageRoute, localeFromPathname, localeHome, stripLocalePrefix } from '../src/lib/i18n/paths.ts';

test('all language homepages have a unique public URL with English at the root', () => {
  const urls = LANGUAGES.map(({ code }) => localeHome(code));
  assert.equal(new Set(urls).size, 16);
  assert.equal(localeHome('en'), '/');
  for (const { code } of LANGUAGES) assert.equal(localeFromPathname(localeHome(code)), code);
  assert.equal(localeFromPathname('/calculator/fraction'), 'en');
  assert.equal(localeFromPathname('/not-a-language'), 'en');
});

test('all homepages share reciprocal language alternates and the English default', () => {
  const alternates = languageAlternates();
  assert.equal(Object.keys(alternates).length, 17);
  assert.equal(alternates.en, 'https://math-solver.io');
  assert.equal(alternates['x-default'], alternates.en);
  for (const { code } of LANGUAGES) assert.equal(alternates[code], 'https://math-solver.io' + (localeHome(code) === '/' ? '' : localeHome(code)));
});

test('language switching keeps translated practice URLs and does not invent editorial translations', () => {
  assert.equal(languageHref('ru', '/es'), '/ru');
  assert.equal(languageHref('uz', '/ru/practice-tests'), '/uz/practice-tests');
  assert.equal(languageHref('en', '/es/practice-tests'), '/practice-tests');
  assert.equal(languageHref('es', '/calculator/fraction'), '/es');
  assert.equal(languageHref('en', '/calculator/fraction'), '/calculator/fraction');
  assert.equal(stripLocalePrefix('/ru'), '/');
  assert.equal(stripLocalePrefix('/uz/practice-tests'), '/practice-tests');
});

test('English rewriting preserves APIs, assets and generated calculator images', () => {
  assert.deepEqual(languageRoute('/'), { kind: 'rewrite', pathname: '/en' });
  assert.deepEqual(languageRoute('/calculator/fraction'), { kind: 'rewrite', pathname: '/en/calculator/fraction' });
  assert.deepEqual(languageRoute('/calculator/fraction/opengraph-image'), { kind: 'rewrite', pathname: '/en/calculator/fraction/opengraph-image' });
  assert.deepEqual(languageRoute('/auth/action'), { kind: 'rewrite', pathname: '/en/auth/action' });
  for (const pathname of ['/api/solve', '/api/mobile/v1/solve', '/_next/static/main.js', '/sitemap.xml', '/robots.txt', '/icon.png', '/images/mobile.webp']) {
    assert.deepEqual(languageRoute(pathname), { kind: 'next', pathname });
  }
  assert.deepEqual(languageRoute('/en'), { kind: 'redirect', pathname: '/' });
  assert.deepEqual(languageRoute('/en/calculator/fraction'), { kind: 'redirect', pathname: '/calculator/fraction' });
  assert.deepEqual(languageRoute('/ru'), { kind: 'next', pathname: '/ru' });
});

test('every landing catalog contains the complete localized content with intact placeholders', () => {
  const read = code => JSON.parse(readFileSync(new URL(`../src/lib/i18n/landing/${code}.json`, import.meta.url)));
  const english = read('en');
  function compare(base, actual, path) {
    assert.equal(typeof actual, typeof base, path);
    if (typeof base === 'string') {
      assert.equal(Boolean(actual.trim()), Boolean(base.trim()), path);
      assert.deepEqual(actual.match(/\{\w+\}/g) ?? [], base.match(/\{\w+\}/g) ?? [], path);
    } else if (Array.isArray(base)) {
      assert.ok(Array.isArray(actual), path); assert.equal(actual.length, base.length, path);
      base.forEach((value, index) => compare(value, actual[index], `${path}.${index}`));
    } else {
      assert.deepEqual(Object.keys(actual).sort(), Object.keys(base).sort(), path);
      Object.keys(base).forEach(key => compare(base[key], actual[key], `${path}.${key}`));
    }
  }
  for (const { code } of LANGUAGES) {
    const copy = read(code); compare(english, copy, code);
    assert.equal(copy.popularCalculators.length, 14); assert.equal(copy.faqs.length, 8);
    assert.ok(copy.metaDescription.length > 60);
    if (code !== 'en') {
      for (const key of ['metaTitle', 'metaDescription', 'introTitle', 'faqTitle', 'copyright']) assert.notEqual(copy[key], english[key], `${code}.${key}`);
      copy.introParagraphs.forEach((text, index) => assert.notEqual(text, english.introParagraphs[index], code));
      copy.faqs.forEach((item, index) => assert.notEqual(item.answer, english.faqs[index].answer, code));
    }
  }
});
