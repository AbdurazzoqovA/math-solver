// Runtime-only ADC adapter for Azure Container Apps. No static private key.
// Loaded before the unchanged production server with node --require.
'use strict';
const fs = require('node:fs');
const directory = '/tmp/mathsolver-google-auth';
const required = name => {
  if (!process.env[name]) throw new Error(`Missing federation setting: ${name}`);
  return process.env[name];
};
const endpoint = new URL(required('IDENTITY_ENDPOINT'));
if (endpoint.protocol !== 'http:' || endpoint.username || endpoint.password) {
  throw new Error('Invalid managed-identity endpoint');
}
endpoint.searchParams.set('resource', required('AZURE_FEDERATION_AUDIENCE'));
endpoint.searchParams.set('api-version', '2019-08-01');
endpoint.searchParams.set('client_id', required('AZURE_CLIENT_ID'));
const serviceAccount = required('GCP_FEDERATION_SERVICE_ACCOUNT');
if (!/^[a-zA-Z0-9@._-]+$/.test(serviceAccount)) throw new Error('Invalid service account');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const configuration = {
  type: 'external_account',
  audience: required('GCP_FEDERATION_AUDIENCE'),
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  token_url: 'https://sts.googleapis.com/v1/token',
  service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
  credential_source: {
    url: endpoint.toString(),
    headers: { 'X-IDENTITY-HEADER': required('IDENTITY_HEADER') },
    format: { type: 'json', subject_token_field_name: 'access_token' },
  },
};
process.env.GOOGLE_APPLICATION_CREDENTIALS = `${directory}/credentials.json`;
fs.writeFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(configuration), { mode: 0o600 });
