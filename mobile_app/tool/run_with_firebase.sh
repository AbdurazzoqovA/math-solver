#!/usr/bin/env bash

set -euo pipefail

tool_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_directory="$(cd "${tool_directory}/.." && pwd)"
local_config="${mobile_directory}/firebase.local.json"
local_xcconfig="${mobile_directory}/ios/Flutter/FirebaseLocal.xcconfig"

if [[ ! -f "${local_config}" || ! -f "${local_xcconfig}" ]]; then
  node "${tool_directory}/configure_firebase.mjs"
fi

exec flutter run --dart-define-from-file="${local_config}" "$@"
