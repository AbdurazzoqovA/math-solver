#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "$service_dir/../.." && pwd)"
cloud_project="${VIDEO_CLOUD_PROJECT:-axial-willow-428621-n4}"
firebase_project="${FIREBASE_ADMIN_PROJECT_ID:-math-solver-e3a55}"
cloud_region="${VIDEO_CLOUD_REGION:-us-central1}"
queue_name="${VIDEO_QUEUE_NAME:-video-render}"
bucket_name="${VIDEO_STORAGE_BUCKET:-${cloud_project}-mathsolver-video}"
renderer_service="${VIDEO_RENDERER_SERVICE:-mathsolver-video-renderer}"
renderer_account="mathsolver-video-renderer@${cloud_project}.iam.gserviceaccount.com"
task_account="mathsolver-video-tasks@${cloud_project}.iam.gserviceaccount.com"
secret_name="${VIDEO_GEMINI_SECRET:-mathsolver-gemini-api-key}"
image_tag="${VIDEO_IMAGE_TAG:-$(git -C "$repo_dir" rev-parse --short HEAD)}"
image_uri="${cloud_region}-docker.pkg.dev/${cloud_project}/cloud-run-source-deploy/${renderer_service}:${image_tag}"

if [[ -z "$(gcloud secrets versions list "$secret_name" \
  --project "$cloud_project" \
  --filter='state=ENABLED' \
  --format='value(name)' \
  --limit 1)" ]]; then
  printf 'Secret %s has no enabled version. Add the Gemini API key first.\n' \
    "$secret_name" >&2
  exit 1
fi

if [[ "${VIDEO_SKIP_BUILD:-false}" != "true" ]]; then
  gcloud builds submit "$service_dir" \
    --project "$cloud_project" \
    --tag "$image_uri"
fi

gcloud run deploy "$renderer_service" \
  --image "$image_uri" \
  --region "$cloud_region" \
  --platform managed \
  --no-allow-unauthenticated \
  --service-account "$renderer_account" \
  --memory 4Gi \
  --cpu 2 \
  --concurrency 1 \
  --max-instances 3 \
  --timeout 900 \
  --set-env-vars "FIREBASE_ADMIN_PROJECT_ID=${firebase_project},VIDEO_STORAGE_BUCKET=${bucket_name},VIDEO_STORAGE_PROJECT=${cloud_project},VIDEO_PLAN_ATTEMPTS=2,VIDEO_TTS_ATTEMPTS=5,VIDEO_TTS_WORKERS=1,VIDEO_TTS_PROVIDER=gemini,VIDEO_VOICE_QA=true" \
  --set-secrets "GOOGLE_CLOUD_API_KEY=${secret_name}:latest" \
  --project "$cloud_project"

latest_revision="$(gcloud run services describe "$renderer_service" \
  --region "$cloud_region" \
  --project "$cloud_project" \
  --format='value(status.latestCreatedRevisionName)')"
if [[ -z "$latest_revision" ]]; then
  printf 'Cloud Run did not report a newly created renderer revision.\n' >&2
  exit 1
fi
gcloud run services update-traffic "$renderer_service" \
  --region "$cloud_region" \
  --project "$cloud_project" \
  --to-revisions "${latest_revision}=100"

renderer_url="$(gcloud run services describe "$renderer_service" \
  --region "$cloud_region" \
  --project "$cloud_project" \
  --format='value(status.url)')"

gcloud run services add-iam-policy-binding "$renderer_service" \
  --region "$cloud_region" \
  --member "serviceAccount:${task_account}" \
  --role roles/run.invoker \
  --project "$cloud_project"

if [[ "${VIDEO_UPDATE_WEB_SERVICE:-true}" == "true" ]]; then
  gcloud run services update mathsolver \
    --region "$cloud_region" \
    --update-env-vars "FIREBASE_ADMIN_PROJECT_ID=${firebase_project},GOOGLE_CLOUD_PROJECT=${cloud_project},VIDEO_STORAGE_BUCKET=${bucket_name},VIDEO_QUEUE_MODE=cloud-tasks,VIDEO_QUEUE_PROJECT=${cloud_project},VIDEO_QUEUE_LOCATION=${cloud_region},VIDEO_QUEUE_NAME=${queue_name},VIDEO_RENDERER_URL=${renderer_url},VIDEO_TASK_SERVICE_ACCOUNT=${task_account},VIDEO_FREE_LIMIT=10" \
    --project "$cloud_project"
  printf 'The MathSolver service now has the video runtime configuration.\n'
else
  printf 'Skipped the MathSolver service update.\n'
fi

printf 'Private renderer deployed: %s\n' "$renderer_url"
printf 'Renderer traffic: 100%% %s\n' "$latest_revision"
