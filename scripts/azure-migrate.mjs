#!/usr/bin/env node
// Migrate the deployed image/configuration; never rebuild the dirty local tree.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const subscription = '30cab141-dd6f-4b67-8eab-b6c9f146e25a';
export const group = 'mathsolver-azure';
export const name = 'mathsolver';
const environment = 'mathsolver-env';
const registry = 'mathsolverazure30cab';
const registryHost = `${registry}.azurecr.io`;
const project = 'axial-willow-428621-n4';
const account = 'support@detecting-ai.com';
const projectNumber = '879894253005';
const pool = 'mathsolver-azure';
const provider = 'azure-managed-identity';
const root = `/subscriptions/${subscription}/resourceGroups/${group}`;
export const state = resolve('.azure-migration');
mkdirSync(state, { recursive: true, mode: 0o700 });
export const save = (key, data) => writeFileSync(resolve(state, `${key}.json`), JSON.stringify(data, null, 2), { mode: 0o600 });
export const read = key => JSON.parse(readFileSync(resolve(state, `${key}.json`), 'utf8'));
export function run(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    // Provider errors/arguments may contain secrets. Keep them out of output.
    save('last-error', { command: [bin, ...args.slice(0, 3)], status: error.status, stderr: String(error.stderr || '') });
    throw new Error(`${bin} ${args.slice(0, 2).join(' ')} failed (exit ${error.status}); private diagnostic saved`);
  }
}
export const az = (...args) => run('az', [...args, '--subscription', subscription, '--only-show-errors']);
export const gc = (...args) => run('gcloud', [...args, '--project', project, '--account', account]);
const command = process.argv[2];
const mutation = ['provision', 'registry-token', 'federate', 'import', 'deploy', 'readiness-job'];
if (mutation.includes(command) && process.env.CONFIRM_MATHSOLVER_AZURE !== 'yes') throw new Error('Set CONFIRM_MATHSOLVER_AZURE=yes for cloud changes');

if (command === 'snapshot' || command === 'refresh-source') {
  if (command === 'snapshot' && existsSync(resolve(state, 'source.json'))) {
    console.log('Original production snapshot retained');
  } else {
    const service = JSON.parse(gc('run', 'services', 'describe', name, '--region', 'us-central1', '--format=json'));
    const traffic = service.status.traffic.filter(t => t.percent > 0);
    if (traffic.length !== 1 || traffic[0].percent !== 100) throw new Error('Expected one serving revision');
    const revision = JSON.parse(gc('run', 'revisions', 'describe', traffic[0].revisionName, '--region', 'us-central1', '--format=json'));
    if (revision.spec.containers.length !== 1 || revision.spec.volumes?.length) throw new Error('Unexpected topology');
    const resolvedEnv = {}, secretRefs = [];
    const token = gc('auth', 'print-access-token');
    for (const entry of revision.spec.containers[0].env || []) {
      if (!entry.valueFrom) { resolvedEnv[entry.name] = entry.value ?? ''; continue; }
      const ref = entry.valueFrom.secretKeyRef;
      if (!ref || !/^\d+$/.test(ref.key) || !/^[a-zA-Z0-9_-]+$/.test(ref.name)) throw new Error('Expected a pinned same-project secret');
      const response = await fetch(`https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${ref.name}/versions/${ref.key}:access`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Secret read failed: ${entry.name}, HTTP ${response.status}`);
      const payload = await response.json();
      const bytes = Buffer.from(payload.payload.data, 'base64');
      const value = bytes.toString('utf8');
      if (!Buffer.from(value).equals(bytes)) throw new Error('Secret must be UTF-8');
      resolvedEnv[entry.name] = value;
      secretRefs.push({ env: entry.name, secret: ref.name, version: ref.key });
    }
    const image = revision.status.imageDigest;
    if (!image?.includes('@sha256:')) throw new Error('Missing image digest');
    if (existsSync(resolve(state, 'federation.json')) && read('federation').serviceAccount !== revision.spec.serviceAccountName) throw new Error('Runtime identity changed; review federation before deployment');
    if (existsSync(resolve(state, 'source.json'))) {
      const previous = read('source');
      const archive = `source-${previous.revision.metadata.name}-${previous.capturedAt.replaceAll(/[^0-9]/g, '')}`;
      if (!existsSync(resolve(state, `${archive}.json`))) save(archive, previous);
      const changedNames = [...new Set([...Object.keys(previous.resolvedEnv), ...Object.keys(resolvedEnv)])].filter(key => previous.resolvedEnv[key] !== resolvedEnv[key]);
      console.log(JSON.stringify({ previousRevision: previous.revision.metadata.name, changedEnvironmentNames: changedNames, pinnedSecretReferencesUnchanged: JSON.stringify(previous.secretRefs) === JSON.stringify(secretRefs) }));
    }
    save('source', { capturedAt: new Date().toISOString(), service, revision, resolvedEnv, secretRefs, image, tag: `migration-${revision.metadata.name}` });
    console.log(JSON.stringify({ revision: revision.metadata.name, image, environmentCount: Object.keys(resolvedEnv).length, pinnedSecrets: secretRefs.length }));
  }
} else if (command === 'provision') {
  if (az('group', 'exists', '-n', group) === 'false') {
    az('group', 'create', '-n', group, '-l', 'eastus2', '--tags', 'application=mathsolver', 'migration=20260920', '-o', 'none');
    save('provisioning-started', { at: new Date().toISOString() });
  } else if (!existsSync(resolve(state, 'provisioning-started.json'))) throw new Error('Resource group predates this migration');
  const resources = JSON.parse(az('resource', 'list', '-g', group, '-o', 'json'));
  if (!resources.some(r => r.name === registry)) az('acr', 'create', '-g', group, '-n', registry, '-l', 'eastus2', '--sku', 'Basic', '--admin-enabled', 'false', '-o', 'none');
  if (!resources.some(r => r.name === 'mathsolver-identity')) az('identity', 'create', '-g', group, '-n', 'mathsolver-identity', '-l', 'eastus2', '-o', 'none');
  const identity = JSON.parse(az('identity', 'show', '-g', group, '-n', 'mathsolver-identity', '-o', 'json'));
  save('identity', identity);
  console.log('Private registry and managed identity ready');
  if (!resources.some(r => r.name === environment)) az('containerapp', 'env', 'create', '-g', group, '-n', environment, '-l', 'eastus2', '--enable-workload-profiles', 'true', '-o', 'none');
  console.log('Container Apps environment ready');
} else if (command === 'registry-token') {
  if (existsSync(resolve(state, 'registry-token.json'))) console.log('Existing migration pull credential retained');
  else {
    const tokenName = 'mathsolver-pull';
    const existing = JSON.parse(az('acr', 'token', 'list', '-r', registry, '--query', `[?name=='${tokenName}'].name`, '-o', 'json'));
    if (existing.length) throw new Error('Token exists without saved metadata; refusing rotation');
    const token = JSON.parse(az('acr', 'token', 'create', '-r', registry, '-n', tokenName, '--repository', name, 'content/read', 'metadata/read', '-o', 'json'));
    const password = token.credentials?.passwords?.find(p => p.value)?.value;
    if (!password) throw new Error('No new pull credential returned');
    save('registry-token', { name: tokenName, password });
    console.log('Created a new pull credential scoped only to the Mathsolver image');
  }
} else if (command === 'federate') {
  const identity = read('identity');
  const source = read('source');
  let application;
  if (existsSync(resolve(state, 'federation-app.json'))) application = read('federation-app');
  else {
    const existing = JSON.parse(run('az', ['ad', 'app', 'list', '--display-name', 'MathSolver Azure Google Federation', '-o', 'json']));
    if (existing.length) throw new Error('Federation application already exists without migration metadata');
    application = JSON.parse(run('az', ['ad', 'app', 'create', '--display-name', 'MathSolver Azure Google Federation', '--sign-in-audience', 'AzureADMyOrg', '-o', 'json']));
    save('federation-app', application);
  }
  const audience = `api://${application.appId}`;
  run('az', ['ad', 'app', 'update', '--id', application.appId, '--identifier-uris', audience]);
  const servicePrincipals = JSON.parse(run('az', ['ad', 'sp', 'list', '--filter', `appId eq '${application.appId}'`, '-o', 'json']));
  if (!servicePrincipals.length) run('az', ['ad', 'sp', 'create', '--id', application.appId, '-o', 'none']);
  gc('services', 'enable', 'iam.googleapis.com', 'iamcredentials.googleapis.com', 'sts.googleapis.com');
  const pools = JSON.parse(gc('iam', 'workload-identity-pools', 'list', '--location', 'global', '--format=json'));
  if (!pools.some(p => p.name.endsWith(`/${pool}`))) gc('iam', 'workload-identity-pools', 'create', pool, '--location', 'global', '--display-name', 'MathSolver Azure');
  const providers = JSON.parse(gc('iam', 'workload-identity-pools', 'providers', 'list', '--workload-identity-pool', pool, '--location', 'global', '--format=json'));
  if (!providers.some(p => p.name.endsWith(`/${provider}`))) gc('iam', 'workload-identity-pools', 'providers', 'create-oidc', provider, '--workload-identity-pool', pool, '--location', 'global', '--issuer-uri', `https://sts.windows.net/${identity.tenantId}/`, '--allowed-audiences', audience, '--attribute-mapping', 'google.subject=assertion.oid', '--attribute-condition', `assertion.oid == '${identity.principalId}' && assertion.tid == '${identity.tenantId}'`);
  const principal = `principal://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/subject/${identity.principalId}`;
  gc('iam', 'service-accounts', 'add-iam-policy-binding', source.revision.spec.serviceAccountName, '--member', principal, '--role', 'roles/iam.workloadIdentityUser', '--condition=None', '--format=none');
  save('federation', { audience, principal, serviceAccount: source.revision.spec.serviceAccountName, providerAudience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}` });
  console.log('Keyless federation established for this Azure identity only; existing keys unchanged');
} else if (command === 'import') {
  const source = read('source');
  az('acr', 'import', '-n', registry, '--source', source.image, '--image', `${name}:${source.tag}`, '--username', 'oauth2accesstoken', '--password', gc('auth', 'print-access-token'), '-o', 'none');
  const digest = az('acr', 'repository', 'show', '-n', registry, '--image', `${name}:${source.tag}`, '--query', 'digest', '-o', 'tsv');
  if (!source.image.endsWith(`@${digest}`)) throw new Error('Image digest mismatch');
  console.log(`Exact production image imported: ${digest}`);
} else if (command === 'deploy') {
  const source = read('source'), identity = read('identity'), federation = read('federation');
  if (source.revision.spec.serviceAccountName !== federation.serviceAccount) throw new Error('Runtime identity mismatch');
  const port = source.revision.spec.containers[0].ports[0].containerPort;
  const values = { ...source.resolvedEnv, PORT: String(port), HOSTNAME: '0.0.0.0', AZURE_CLIENT_ID: identity.clientId, AZURE_FEDERATION_AUDIENCE: federation.audience, GCP_FEDERATION_AUDIENCE: federation.providerAudience, GCP_FEDERATION_SERVICE_ACCOUNT: federation.serviceAccount };
  const pull = read('registry-token');
  const secrets = [
    { name: 'registry-pull', value: pull.password },
    { name: 'google-auth-bootstrap', value: readFileSync(resolve('infra/azure/google-auth.cjs'), 'utf8') },
    { name: 'migration-readiness', value: readFileSync(resolve('infra/azure/readiness.cjs'), 'utf8') },
  ];
  const env = Object.entries(values).map(([key, value]) => {
    if (/KEY|SECRET|TOKEN|PASSWORD|TELEGRAM_CHAT_ID/.test(key) && !key.startsWith('NEXT_PUBLIC_')) {
      const secretRef = key.toLowerCase().replaceAll('_', '-');
      secrets.push({ name: secretRef, value });
      return { name: key, secretRef };
    }
    return { name: key, value };
  });
  const body = { location: 'eastus2', tags: { application: name, sourceRevision: source.revision.metadata.name }, identity: { type: 'UserAssigned', userAssignedIdentities: { [identity.id]: {} } }, properties: {
    managedEnvironmentId: `${root}/providers/Microsoft.App/managedEnvironments/${environment}`, workloadProfileName: 'Consumption',
    configuration: { activeRevisionsMode: 'Single', ingress: { external: true, targetPort: port, transport: 'auto', allowInsecure: false, traffic: [{ latestRevision: true, weight: 100 }] }, registries: [{ server: registryHost, username: pull.name, passwordSecretRef: 'registry-pull' }], secrets },
    template: { terminationGracePeriodSeconds: 300, containers: [{ name, image: `${registryHost}/${name}@${source.image.split('@')[1]}`, command: ['node'], args: ['--require', '/mnt/azure/google-auth.cjs', 'server.js'], env, resources: { cpu: 2, memory: '4Gi' }, volumeMounts: [{ volumeName: 'azure-bootstrap', mountPath: '/mnt/azure' }], probes: [
      { type: 'Startup', tcpSocket: { port }, periodSeconds: 5, timeoutSeconds: 3, failureThreshold: 30 },
      { type: 'Readiness', tcpSocket: { port }, periodSeconds: 10, timeoutSeconds: 3, failureThreshold: 3 },
      { type: 'Liveness', tcpSocket: { port }, initialDelaySeconds: 30, periodSeconds: 30, timeoutSeconds: 3, failureThreshold: 3 },
    ] }], volumes: [{ name: 'azure-bootstrap', storageType: 'Secret', secrets: [{ secretRef: 'google-auth-bootstrap', path: 'google-auth.cjs' }, { secretRef: 'migration-readiness', path: 'readiness.cjs' }] }], scale: { minReplicas: 1, maxReplicas: 20, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '160' } } }] } },
  } };
  const existing = JSON.parse(az('containerapp', 'list', '-g', group, '-o', 'json')).find(a => a.name === name);
  if (existing?.properties.configuration.ingress.customDomains?.length) body.properties.configuration.ingress.customDomains = existing.properties.configuration.ingress.customDomains;
  save('deployment', body);
  console.log(az('rest', '--method', 'put', '--url', `https://management.azure.com${root}/providers/Microsoft.App/containerApps/${name}?api-version=2025-01-01`, '--body', `@${resolve(state, 'deployment.json')}`, '--query', '{name:name,state:properties.provisioningState,fqdn:properties.configuration.ingress.fqdn}', '-o', 'json'));
} else if (command === 'readiness-job') {
  const deployment = read('deployment');
  const job = structuredClone(deployment);
  job.properties = {
    environmentId: deployment.properties.managedEnvironmentId,
    workloadProfileName: 'Consumption',
    configuration: {
      triggerType: 'Manual', replicaTimeout: 180, replicaRetryLimit: 0,
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 },
      secrets: deployment.properties.configuration.secrets,
      registries: deployment.properties.configuration.registries,
    },
    template: {
      containers: deployment.properties.template.containers.map(container => {
        const result = { ...container, args: ['--require', '/mnt/azure/google-auth.cjs', '/mnt/azure/readiness.cjs'] };
        delete result.probes;
        return result;
      }),
      volumes: deployment.properties.template.volumes,
    },
  };
  save('readiness-job', job);
  az('rest', '--method', 'put', '--url', `https://management.azure.com${root}/providers/Microsoft.App/jobs/mathsolver-readiness?api-version=2025-01-01`, '--body', `@${resolve(state, 'readiness-job.json')}`, '-o', 'none');
  console.log(az('containerapp', 'job', 'start', '-g', group, '-n', 'mathsolver-readiness', '--query', '{name:name}', '-o', 'json'));
} else if (command === 'verify') {
  const source = read('source');
  const current = JSON.parse(az('containerapp', 'show', '-g', group, '-n', name, '-o', 'json'));
  const secrets = JSON.parse(az('containerapp', 'secret', 'list', '-g', group, '-n', name, '--show-values', '-o', 'json'));
  const lookup = Object.fromEntries(secrets.map(s => [s.name, s.value]));
  const container = current.properties.template.containers.find(c => c.name === name);
  const actual = Object.fromEntries(container.env.map(e => [e.name, e.secretRef ? lookup[e.secretRef] : e.value]));
  const mismatch = Object.keys(source.resolvedEnv).filter(key => actual[key] !== source.resolvedEnv[key]);
  if (mismatch.length) throw new Error(`Configuration mismatch: ${mismatch.join(', ')}`);
  if (current.properties.template.scale.minReplicas !== 1 || current.properties.template.scale.maxReplicas !== 20) throw new Error('Scaling mismatch');
  if (!container.image.endsWith(source.image.split('@')[1])) throw new Error('Image mismatch');
  if (current.properties.provisioningState !== 'Succeeded' || current.properties.latestReadyRevisionName !== current.properties.latestRevisionName) throw new Error('Latest revision is not ready');
  const result = { at: new Date().toISOString(), state: current.properties.provisioningState, revision: current.properties.latestReadyRevisionName, preservedEnvironmentValues: Object.keys(source.resolvedEnv).length, unchangedPinnedSecrets: source.secretRefs.length, minReplicas: 1, maxReplicas: 20, exactProductionImage: true, fqdn: current.properties.configuration.ingress.fqdn };
  save('verification', result); console.log(JSON.stringify(result));
}
