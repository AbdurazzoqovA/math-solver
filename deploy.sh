#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_env_file() {
  local env_file="$1"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

require_env() {
  local variable_name="$1"

  if [[ -z "${!variable_name:-}" ]]; then
    printf 'Missing %s. Add it to an ignored .env.local or .env.development.local.\n' "$variable_name" >&2
    exit 1
  fi
}

load_env_file "$repo_dir/.env.local"
load_env_file "$repo_dir/.env.development.local"

for required_variable in \
  NEXT_PUBLIC_FIREBASE_API_KEY \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  NEXT_PUBLIC_FIREBASE_APP_ID; do
  require_env "$required_variable"
done

cloud_project="axial-willow-428621-n4"
cloud_region="us-central1"
image_tag="${DEPLOY_IMAGE_TAG:-$(git -C "$repo_dir" rev-parse --short HEAD)}"
image_uri="${cloud_region}-docker.pkg.dev/${cloud_project}/cloud-run-source-deploy/mathsolver:${image_tag}"

gcloud builds submit "$repo_dir" \
  --project "$cloud_project" \
  --config "$repo_dir/cloudbuild.yaml" \
  --substitutions "_IMAGE_URI=${image_uri},_NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},_NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}"

gcloud run deploy mathsolver \
  --image "$image_uri" \
  --region "$cloud_region" \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 20 \
  --project "$cloud_project"
