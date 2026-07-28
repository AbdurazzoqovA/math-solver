#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cloud_project="${VIDEO_CLOUD_PROJECT:-axial-willow-428621-n4}"
firebase_project="${FIREBASE_ADMIN_PROJECT_ID:-math-solver-e3a55}"
cloud_region="${VIDEO_CLOUD_REGION:-us-central1}"
queue_name="${VIDEO_QUEUE_NAME:-video-render}"
bucket_name="${VIDEO_STORAGE_BUCKET:-${cloud_project}-mathsolver-video}"
renderer_service="${VIDEO_RENDERER_SERVICE:-mathsolver-video-renderer}"
renderer_account_name="mathsolver-video-renderer"
task_account_name="mathsolver-video-tasks"
secret_name="${VIDEO_GEMINI_SECRET:-mathsolver-gemini-api-key}"
renderer_account="${renderer_account_name}@${cloud_project}.iam.gserviceaccount.com"
task_account="${task_account_name}@${cloud_project}.iam.gserviceaccount.com"

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required tool: %s\n' "$1" >&2
    exit 1
  fi
}

ensure_service_account() {
  local account_name="$1"
  local display_name="$2"
  if ! gcloud iam service-accounts describe \
    "${account_name}@${cloud_project}.iam.gserviceaccount.com" \
    --project "$cloud_project" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$account_name" \
      --display-name "$display_name" \
      --project "$cloud_project"
  fi
}

require_tool gcloud

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudtasks.googleapis.com \
  iamcredentials.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --project "$cloud_project"

gcloud services enable \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  --project "$firebase_project"

ensure_service_account "$renderer_account_name" "MathSolver video renderer"
ensure_service_account "$task_account_name" "MathSolver video task invoker"

web_account="$(gcloud run services describe mathsolver \
  --region "$cloud_region" \
  --project "$cloud_project" \
  --format='value(spec.template.spec.serviceAccountName)')"
if [[ -z "$web_account" ]]; then
  project_number="$(gcloud projects describe "$cloud_project" \
    --format='value(projectNumber)')"
  web_account="${project_number}-compute@developer.gserviceaccount.com"
fi

if ! gcloud storage buckets describe "gs://${bucket_name}" \
  --project "$cloud_project" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${bucket_name}" \
    --project "$cloud_project" \
    --location "$cloud_region" \
    --default-storage-class STANDARD \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

gcloud storage buckets update "gs://${bucket_name}" \
  --cors-file "$repo_dir/infra/video/bucket-cors.json" \
  --lifecycle-file "$repo_dir/infra/video/bucket-lifecycle.json" \
  --public-access-prevention \
  --uniform-bucket-level-access \
  --project "$cloud_project"

gcloud storage buckets add-iam-policy-binding "gs://${bucket_name}" \
  --member "serviceAccount:${renderer_account}" \
  --role roles/storage.objectAdmin \
  --project "$cloud_project"
gcloud storage buckets add-iam-policy-binding "gs://${bucket_name}" \
  --member "serviceAccount:${web_account}" \
  --role roles/storage.objectAdmin \
  --project "$cloud_project"

if ! gcloud tasks queues describe "$queue_name" \
  --location "$cloud_region" \
  --project "$cloud_project" >/dev/null 2>&1; then
  gcloud tasks queues create "$queue_name" \
    --location "$cloud_region" \
    --max-attempts 3 \
    --max-retry-duration 1800s \
    --min-backoff 10s \
    --max-backoff 120s \
    --max-dispatches-per-second 2 \
    --max-concurrent-dispatches 3 \
    --log-sampling-ratio 1 \
    --project "$cloud_project"
fi

gcloud projects add-iam-policy-binding "$cloud_project" \
  --member "serviceAccount:${web_account}" \
  --role roles/cloudtasks.enqueuer \
  --condition None
gcloud projects add-iam-policy-binding "$firebase_project" \
  --member "serviceAccount:${web_account}" \
  --role roles/datastore.user \
  --condition None
gcloud projects add-iam-policy-binding "$firebase_project" \
  --member "serviceAccount:${web_account}" \
  --role roles/firebaseauth.viewer \
  --condition None
gcloud projects add-iam-policy-binding "$firebase_project" \
  --member "serviceAccount:${renderer_account}" \
  --role roles/datastore.user \
  --condition None

gcloud iam service-accounts add-iam-policy-binding "$task_account" \
  --member "serviceAccount:${web_account}" \
  --role roles/iam.serviceAccountUser \
  --project "$cloud_project"
gcloud iam service-accounts add-iam-policy-binding "$web_account" \
  --member "serviceAccount:${web_account}" \
  --role roles/iam.serviceAccountTokenCreator \
  --project "$cloud_project"

project_number="$(gcloud projects describe "$cloud_project" \
  --format='value(projectNumber)')"
cloud_tasks_agent="service-${project_number}@gcp-sa-cloudtasks.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "$task_account" \
  --member "serviceAccount:${cloud_tasks_agent}" \
  --role roles/iam.serviceAccountTokenCreator \
  --project "$cloud_project"

if ! gcloud secrets describe "$secret_name" \
  --project "$cloud_project" >/dev/null 2>&1; then
  gcloud secrets create "$secret_name" \
    --replication-policy automatic \
    --project "$cloud_project"
fi
gcloud secrets add-iam-policy-binding "$secret_name" \
  --member "serviceAccount:${renderer_account}" \
  --role roles/secretmanager.secretAccessor \
  --project "$cloud_project"

if ! gcloud firestore fields ttls update deleteAt \
  --collection-group videoJobs \
  --database "(default)" \
  --enable-ttl \
  --async \
  --project "$firebase_project"; then
  printf 'Managed Firestore TTL is unavailable; per-job Cloud Tasks cleanup remains authoritative.\\n' >&2
fi

printf 'Video infrastructure is configured.\n'
printf 'Bucket: gs://%s\n' "$bucket_name"
printf 'Queue: %s/%s\n' "$cloud_region" "$queue_name"
printf 'Renderer service account: %s\n' "$renderer_account"
printf 'Task service account: %s\n' "$task_account"
printf 'Before deploying, add the Gemini key as a version of Secret Manager secret %s.\n' "$secret_name"
printf 'The renderer deployment script will keep the Cloud Run service private.\n'
printf 'Renderer service name: %s\n' "$renderer_service"
