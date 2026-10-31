#!/usr/bin/env node
// Public synthetic smoke; no accounts, notifications, lessons, or user records.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const base = process.argv[2];
const origin = process.argv.includes('--origin');
if (!base?.startsWith('https://')) throw new Error('Expected HTTPS base URL');
const results = [];
const request = async (path, options = {}) => {
  if (!origin) {
    const response = await fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(90000), ...options });
    return { status: response.status, body: await response.text() };
  }
  const host = new URL(base).hostname;
  const args = ['--silent', '--show-error', '--max-time', '90', '--resolve', `${host}:443:20.69.202.190`, '--cacert', '.azure-migration/cloudflare-origin-rsa-root.pem', '--write-out', '\n%{http_code}', `${base}${path}`];
  if (options.method) args.push('-X', options.method);
  for (const [key, value] of Object.entries(options.headers || {})) args.push('-H', `${key}: ${value}`);
  if (options.body) args.push('--data-binary', options.body);
  const output = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const split = output.lastIndexOf('\n');
  return { status: Number(output.slice(split + 1)), body: output.slice(0, split) };
};
async function check(name, path, options = {}, expected = 200, validate = () => {}) {
  const at = Date.now();
  try {
    const response = await request(path, options);
    assert.equal(response.status, expected);
    validate(response.body);
    results.push({ name, ok: true, status: response.status, ms: Date.now() - at });
    return response.body;
  } catch (error) {
    results.push({ name, ok: false, error: error.code || error.name, ms: Date.now() - at });
    return '';
  }
}
const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const home = await check('home', '/', {}, 200, body => assert.match(body, /MathSolver/));
for (const route of ['/calculator', '/blog', '/pricing', '/privacy', '/terms', '/contact', '/account-deletion', '/robots.txt', '/sitemap.xml', '/api/mobile/v1/app-config?platform=android&version=1.0.2', '/api/mobile/v1/app-config?platform=ios&version=1.0.2']) {
  await check(route, route);
}
await check('private-video-library-guard', '/api/video/jobs', {}, 401);
await check('mobile-video-auth-guard', '/api/mobile/v1/video/jobs', {}, 401);
await check('solve-body-guard', '/api/solve', post({}), 400);
await check('solve-stream', '/api/solve', post({ messages: [{ role: 'user', content: 'Solve 4x + 7 = 31.' }] }), 200, body => { assert.match(body, /Final Answer/i); assert.match(body, /6/); });
await check('practice-generation', '/api/practice', post({ topic: 'One-step linear equations for a migration smoke test' }), 200, body => assert.equal(JSON.parse(body).questions.length, 4));
const assets = [...new Set([...home.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]))];
for (const asset of assets) await check(`asset:${asset.split('/').at(-1)}`, asset);
const report = { at: new Date().toISOString(), base, origin, passed: results.filter(r => r.ok).length, total: results.length, results };
if (process.env.SMOKE_REPORT) writeFileSync(process.env.SMOKE_REPORT, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
process.exitCode = results.every(r => r.ok) ? 0 : 1;
