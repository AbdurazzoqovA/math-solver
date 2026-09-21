#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd "$service_dir/../.." && pwd)"
# Local model defaults; explicit shell overrides win, including rollback.
tts_overrides=()
for variable_name in VIDEO_TTS_PROVIDER AZURE_TTS_ENDPOINT AZURE_TTS_VOICE \
  AZURE_TTS_API_KEY VIDEO_TTS_MODEL VIDEO_TTS_VOICE VIDEO_TTS_STYLE \
  VIDEO_AZURE_TTS_SECRET VIDEO_AZURE_TTS_SECRET_VERSION \
  VIDEO_LLM_PROVIDER LLM_PROVIDER AZURE_LLM_ENDPOINT AZURE_LLM_DEPLOYMENT AZURE_LLM_API_KEY \
  VIDEO_AZURE_LLM_SECRET VIDEO_AZURE_LLM_SECRET_VERSION; do
  if [[ -n "${!variable_name+x}" ]]; then
    tts_overrides+=("${variable_name}=${!variable_name}")
  fi
done
if [[ -f "$repo_dir/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$repo_dir/.env"
  set +a
fi
for setting in ${tts_overrides[@]+"${tts_overrides[@]}"}; do
  export "$setting"
done
tts_provider="${VIDEO_TTS_PROVIDER:-gemini}"
llm_provider="${VIDEO_LLM_PROVIDER:-${LLM_PROVIDER:-gemini}}"
if [[ "$llm_provider" != "azure" && "$llm_provider" != "gemini" ]]; then
  printf 'LLM_PROVIDER must be azure or gemini.\n' >&2
  exit 1
fi
if [[ "$tts_provider" != "azure" && "$tts_provider" != "gemini" ]]; then
  printf 'Production VIDEO_TTS_PROVIDER must be azure or gemini.\n' >&2
  exit 1
fi
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

secret_version="${VIDEO_GEMINI_SECRET_VERSION:-}"
if [[ -z "$secret_version" ]]; then
  secret_version="$(gcloud secrets versions list "$secret_name" \
    --project "$cloud_project" \
    --filter='state=ENABLED' \
    --sort-by='~createTime' \
    --format='value(name)' \
    --limit 1)"
fi
if [[ -z "$secret_version" ]]; then
  printf 'Secret %s has no enabled version. Add the Gemini API key first.\n' \
    "$secret_name" >&2
  exit 1
fi

runtime_env="FIREBASE_ADMIN_PROJECT_ID=${firebase_project}|VIDEO_STORAGE_BUCKET=${bucket_name}|VIDEO_STORAGE_PROJECT=${cloud_project}|VIDEO_PLAN_ATTEMPTS=2|VIDEO_TTS_ATTEMPTS=5|VIDEO_TTS_WORKERS=1|VIDEO_TTS_PROVIDER=${tts_provider}|VIDEO_VOICE_QA=true|VIDEO_TTS_MODEL=${VIDEO_TTS_MODEL:-gemini-3.1-flash-tts-preview}|VIDEO_TTS_VOICE=${VIDEO_TTS_VOICE:-Sulafat}"
runtime_secrets="GOOGLE_CLOUD_API_KEY=${secret_name}:${secret_version}"
runtime_env+="|LLM_PROVIDER=${llm_provider}|VIDEO_LLM_PROVIDER=${llm_provider}"
if [[ "$llm_provider" == "azure" ]]; then
  if [[ -z "${AZURE_LLM_ENDPOINT:-}" ]]; then
    printf 'Configure AZURE_LLM_ENDPOINT in ignored .env before deploying.\n' >&2
    exit 1
  fi
  llm_secret="${VIDEO_AZURE_LLM_SECRET:-mathsolver-video-azure-llm-api-key}"
  llm_version="${VIDEO_AZURE_LLM_SECRET_VERSION:-}"
  if [[ -z "$llm_version" ]]; then
    llm_version="$(gcloud secrets versions list "$llm_secret" \
      --project "$cloud_project" --filter='state=ENABLED' \
      --sort-by='~createTime' --format='value(name)' --limit 1)"
  fi
  if [[ -z "$llm_version" ]]; then
    printf 'Secret %s has no enabled version. Add the Azure LLM key first.\n' \
      "$llm_secret" >&2
    exit 1
  fi
  runtime_secrets+=",AZURE_LLM_API_KEY=${llm_secret}:${llm_version}"
  runtime_env+="|AZURE_LLM_ENDPOINT=${AZURE_LLM_ENDPOINT}|AZURE_LLM_DEPLOYMENT=${AZURE_LLM_DEPLOYMENT:-gpt-4.1-nano}"
fi
if [[ -n "${VIDEO_TTS_STYLE:-}" ]]; then
  runtime_env+="|VIDEO_TTS_STYLE=${VIDEO_TTS_STYLE}"
fi
if [[ "$tts_provider" == "azure" ]]; then
  if [[ -z "${AZURE_TTS_ENDPOINT:-}" ]]; then
    printf 'Configure AZURE_TTS_ENDPOINT in ignored .env before deploying.\n' >&2
    exit 1
  fi
  azure_secret="${VIDEO_AZURE_TTS_SECRET:-mathsolver-azure-tts-api-key}"
  azure_version="${VIDEO_AZURE_TTS_SECRET_VERSION:-}"
  if [[ -z "$azure_version" ]]; then
    azure_version="$(gcloud secrets versions list "$azure_secret" \
      --project "$cloud_project" --filter='state=ENABLED' \
      --sort-by='~createTime' --format='value(name)' --limit 1)"
  fi
  if [[ -z "$azure_version" ]]; then
    printf 'Secret %s has no enabled version. Add the Azure TTS key first.\n' \
      "$azure_secret" >&2
    exit 1
  fi
  runtime_secrets+=",AZURE_TTS_API_KEY=${azure_secret}:${azure_version}"
  runtime_env+="|AZURE_TTS_ENDPOINT=${AZURE_TTS_ENDPOINT}|AZURE_TTS_VOICE=${AZURE_TTS_VOICE:-coral}"
fi
# gcloud's custom separator permits commas in natural-language voice direction.
if [[ "${VIDEO_TTS_STYLE:-}${AZURE_TTS_ENDPOINT:-}${AZURE_TTS_VOICE:-}${VIDEO_TTS_MODEL:-}${VIDEO_TTS_VOICE:-}${AZURE_LLM_ENDPOINT:-}${AZURE_LLM_DEPLOYMENT:-}" == *'|'* ]]; then
  printf 'TTS configuration cannot contain the reserved | separator.\n' >&2
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
  --set-env-vars "^|^${runtime_env}" \
  --set-secrets "$runtime_secrets" \
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
printf 'Narration provider: %s\n' "$tts_provider"
printf 'LLM provider: %s\n' "$llm_provider"
