#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { GoogleAuth } = require('google-auth-library');

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const mobileDirectory = path.resolve(toolDirectory, '..');
const repositoryDirectory = path.resolve(mobileDirectory, '..');
const localJsonPath = path.join(mobileDirectory, 'firebase.local.json');
const localXcconfigPath = path.join(
  mobileDirectory,
  'ios',
  'Flutter',
  'FirebaseLocal.xcconfig',
);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

function required(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function decodeConfig(response) {
  const encoded = required(
    response?.data?.configFileContents,
    'Firebase returned an SDK config without file contents.',
  );
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function plistValue(plist, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = plist.match(
    new RegExp(`<key>${escapedKey}</key>\\s*<string>([^<]+)</string>`),
  );
  return match?.[1]?.trim() || null;
}

function dartDefine(name, value) {
  return Buffer.from(`${name}=${value}`, 'utf8').toString('base64');
}

async function main() {
  const localEnv = {
    ...parseEnvFile(path.join(repositoryDirectory, '.env.local')),
    ...parseEnvFile(path.join(repositoryDirectory, '.env.development.local')),
    ...process.env,
  };
  const configuredCredentialPath = required(
    localEnv.GOOGLE_APPLICATION_CREDENTIALS,
    'Set GOOGLE_APPLICATION_CREDENTIALS or configure it in the ignored root .env.development.local file.',
  );
  const credentialPath = path.isAbsolute(configuredCredentialPath)
    ? configuredCredentialPath
    : path.resolve(repositoryDirectory, configuredCredentialPath);
  if (!fs.existsSync(credentialPath)) {
    throw new Error('The configured Firebase service-account file does not exist.');
  }

  const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  const projectId =
    localEnv.MATHSOLVER_FIREBASE_PROJECT_ID ||
    localEnv.FIREBASE_ADMIN_PROJECT_ID ||
    credential.project_id;
  required(projectId, 'Could not determine the Firebase project ID.');
  if (credential.project_id && credential.project_id !== projectId) {
    throw new Error('The service account belongs to a different Firebase project.');
  }

  const auth = new GoogleAuth({
    keyFile: credentialPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const apiRoot = `https://firebase.googleapis.com/v1beta1/projects/${projectId}`;
  const [iosAppsResponse, androidAppsResponse] = await Promise.all([
    client.request({ url: `${apiRoot}/iosApps` }),
    client.request({ url: `${apiRoot}/androidApps` }),
  ]);

  const iosApp = (iosAppsResponse.data.apps || []).find(
    (app) => app.bundleId === 'io.mathsolver.app',
  );
  const androidApp = (androidAppsResponse.data.apps || []).find(
    (app) => app.packageName === 'io.mathsolver.app',
  );
  required(iosApp, 'Firebase has no iOS app registered for io.mathsolver.app.');
  required(
    androidApp,
    'Firebase has no Android app registered for io.mathsolver.app.',
  );

  const [iosConfigResponse, androidConfigResponse] = await Promise.all([
    client.request({
      url: `https://firebase.googleapis.com/v1beta1/${iosApp.name}/config`,
    }),
    client.request({
      url: `https://firebase.googleapis.com/v1beta1/${androidApp.name}/config`,
    }),
  ]);
  const iosConfig = decodeConfig(iosConfigResponse);
  const androidConfig = JSON.parse(decodeConfig(androidConfigResponse));
  const iosApiKey = required(
    plistValue(iosConfig, 'API_KEY'),
    'The iOS Firebase config has no API key.',
  );
  const androidClient = (androidConfig.client || []).find(
    (entry) => entry?.client_info?.android_client_info?.package_name ===
      'io.mathsolver.app',
  );
  const androidApiKey = required(
    androidClient?.api_key?.[0]?.current_key,
    'The Android Firebase config has no API key.',
  );

  const dartValues = {
    MATHSOLVER_FIREBASE_IOS_API_KEY: iosApiKey,
    MATHSOLVER_FIREBASE_ANDROID_API_KEY: androidApiKey,
    MATHSOLVER_FIREBASE_PROJECT_ID: projectId,
  };
  fs.writeFileSync(localJsonPath, `${JSON.stringify(dartValues, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(localJsonPath, 0o600);

  const encodedDefines = Object.entries(dartValues).map(([name, value]) =>
    dartDefine(name, value),
  );
  fs.writeFileSync(
    localXcconfigPath,
    [
      '// Generated by tool/configure_firebase.mjs. Do not commit.',
      `DART_DEFINES=$(inherited),${encodedDefines.join(',')}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  fs.chmodSync(localXcconfigPath, 0o600);

  console.log('Configured the existing MathSolver Firebase apps locally.');
  console.log(`iOS app: ${iosApp.appId}`);
  console.log(`Android app: ${androidApp.appId}`);
  console.log(`Flutter defines: ${path.relative(repositoryDirectory, localJsonPath)}`);
  console.log(
    `Xcode defines: ${path.relative(repositoryDirectory, localXcconfigPath)}`,
  );
  console.log('No service-account private data was copied.');
}

main().catch((error) => {
  console.error(`Firebase mobile configuration failed: ${error.message}`);
  process.exitCode = 1;
});
