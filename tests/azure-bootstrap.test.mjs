import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../infra/azure/google-auth.cjs', import.meta.url), 'utf8');
const fixture = () => ({
  IDENTITY_ENDPOINT: 'http://127.0.0.1:42356/msi/token', IDENTITY_HEADER: 'synthetic-test-header',
  AZURE_CLIENT_ID: 'test-client', AZURE_FEDERATION_AUDIENCE: 'api://test-application',
  GCP_FEDERATION_AUDIENCE: '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/test/providers/azure',
  GCP_FEDERATION_SERVICE_ACCOUNT: 'test@example.iam.gserviceaccount.com',
});
function execute(env) {
  const writes = [];
  const fs = { mkdirSync: (...args) => writes.push(['mkdir', ...args]), writeFileSync: (...args) => writes.push(['write', ...args]) };
  vm.runInNewContext(source, { URL, process: { env }, require: name => { assert.equal(name, 'node:fs'); return fs; } });
  return writes;
}
test('creates owner-only keyless ADC using the managed identity endpoint', () => {
  const env = fixture(), writes = execute(env);
  assert.equal(writes[0][2].mode, 0o700);
  assert.equal(writes[1][3].mode, 0o600);
  const config = JSON.parse(writes[1][2]);
  assert.equal(config.type, 'external_account');
  assert.equal(config.private_key, undefined);
  assert.equal(config.credential_source.headers['X-IDENTITY-HEADER'], env.IDENTITY_HEADER);
  assert.equal(new URL(config.credential_source.url).searchParams.get('client_id'), env.AZURE_CLIENT_ID);
  assert.match(config.service_account_impersonation_url, /test@example\.iam\.gserviceaccount\.com:generateAccessToken$/);
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, writes[1][1]);
});
test('fails closed when a required federation setting is absent', () => {
  const env = fixture(); delete env.IDENTITY_HEADER;
  assert.throws(() => execute(env), /Missing federation setting: IDENTITY_HEADER/);
});
test('rejects embedded credentials in the identity URL', () => {
  const env = fixture(); env.IDENTITY_ENDPOINT = 'http://user:password@localhost/token';
  assert.throws(() => execute(env), /Invalid managed-identity endpoint/);
});
