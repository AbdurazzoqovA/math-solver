'use strict';
// Read-only dependency checks. No account creation, queue dispatch, data writes,
// real user reads, notifications, or secret/token/signed-URL output.
const { createRequire } = require('node:module');
const appRequire = createRequire('/app/package.json');
const { initializeApp, applicationDefault } = appRequire('firebase-admin/app');
const { getFirestore } = appRequire('firebase-admin/firestore');
const { getAuth } = appRequire('firebase-admin/auth');
const { getStorage } = appRequire('firebase-admin/storage');
const result = {};
async function check(name, callback) {
  try { await callback(); result[name] = 'PASS'; }
  catch (error) { result[name] = { status: 'FAIL', code: error.code || error.status || error.response?.status || 'unknown' }; }
}
(async () => {
  const credential = applicationDefault();
  const app = initializeApp({ credential, projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, storageBucket: process.env.VIDEO_STORAGE_BUCKET }, 'azure-migration-readiness');
  await check('googleFederation', async () => {
    const token = await credential.getAccessToken();
    if (!token.access_token || token.expires_in <= 0) throw new Error('No token');
  });
  await check('firebaseAuth', async () => {
    try { await getAuth(app).getUser('azure-migration-nonexistent-20260920-81c75aad'); }
    catch (error) { if (error.code === 'auth/user-not-found') return; throw error; }
    throw new Error('Unexpected fixture account');
  });
  await check('firestore', async () => { await getFirestore(app).doc('_migrationChecks/nonexistent-20260920-81c75aad').get(); });
  await check('privateStorageRead', async () => { await getStorage(app).bucket().file('_migrationChecks/nonexistent-20260920-81c75aad').exists(); });
  await check('privateStorageSigning', async () => {
    const [url] = await getStorage(app).bucket().file('_migrationChecks/nonexistent-20260920-81c75aad').getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 60000 });
    if (!url.startsWith('https://')) throw new Error('Signing failed');
  });
  await check('cloudTasksEnqueuePermission', async () => {
    const resource = `projects/${process.env.VIDEO_QUEUE_PROJECT}/locations/${process.env.VIDEO_QUEUE_LOCATION}/queues/${process.env.VIDEO_QUEUE_NAME}`;
    const token = await credential.getAccessToken();
    const response = await fetch(`https://cloudtasks.googleapis.com/v2/${resource}:testIamPermissions`, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ permissions: ['cloudtasks.tasks.create'] }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) { const error = new Error('Queue permission check failed'); error.status = response.status; throw error; }
    const data = await response.json();
    if (!data.permissions?.includes('cloudtasks.tasks.create')) throw new Error('Permission missing');
  });
  console.log(JSON.stringify(result));
  process.exit(Object.values(result).every(value => value === 'PASS') ? 0 : 1);
})().catch(() => { console.log('Readiness initialization failed; no credentials printed'); process.exit(1); });
