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
  GOOGLE_CLOUD_API_KEY \
  TURNSTILE_SECRET_KEY \
  NEXT_PUBLIC_TURNSTILE_SITE_KEY \
  PRESSROOM_API_KEY \
  NEXT_PUBLIC_FIREBASE_API_KEY \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  NEXT_PUBLIC_FIREBASE_APP_ID; do
  require_env "$required_variable"
done

gcloud run deploy mathsolver \
  --source "$repo_dir" \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --max-instances 20 \
  --project axial-willow-428621-n4 \
  --update-build-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}" \
  --update-env-vars "GOOGLE_CLOUD_API_KEY=${GOOGLE_CLOUD_API_KEY},TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY},NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY},PRESSROOM_API_KEY=${PRESSROOM_API_KEY}"
