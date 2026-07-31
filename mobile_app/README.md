# MathSolver Mobile

Standalone Flutter app for iOS and Android. Everything mobile-specific lives in
`mobile_app/`; the existing Next.js web app and shared backend remain separate.

## Current product slice

- Light-first, student-focused interface with three destinations: Home, Library,
  and Practice. Profile and settings sit behind the avatar instead of occupying
  a fourth tab.
- One-screen first run with a 13+ confirmation. Camera permission is requested
  only after the student taps Scan.
- One-tap camera capture, crop/rotate, multi-problem worksheet selection,
  photo-library, clipboard, and inline typed input.
- OCR correction before solve, streamed hint-first steps, native LaTeX,
  contextual follow-ups, independent verification, and content-free answer
  reporting.
- **Check My Work** photographs a handwritten attempt, finds the first wrong
  line, explains it, and gives a focused correction instead of simply replacing
  the student's work.
- A local-first solution library, verified-account Firestore merge/sync,
  generated quizzes, a two-minute warm-up, and persisted 1→3→7→14-day mistake
  review.
- Complete Firebase Email/Password create, verify, resend, reset, sign-in, and
  sign-out journeys. Refresh tokens are stored with `flutter_secure_storage`.
- Private visual lessons through the shared renderer: create, list, poll,
  resume, delete, continuous chapter playback, a caption-safe transcript strip,
  0.75–2× playback, full screen, offline download, native sharing, optional
  practice pauses, transfer practice, and content-free push-on-ready
  registration.
- Native Firebase App Check (App Attest with DeviceCheck fallback on iOS, Play
  Integrity on Android), a versioned `/api/mobile/v1/*` gateway, and opt-in-only
  content-free Firebase Analytics.
- Adaptive phone/tablet navigation, an optional dark appearance, and accessible
  loading, empty, rendering, quota, and failure states.

## Run

```bash
flutter pub get
node tool/configure_firebase.mjs
./tool/run_with_firebase.sh
```

The configuration command uses the ignored Firebase Admin credential from the
repository's local environment only to download the already-registered iOS and
Android SDK configs. It extracts their public platform API keys into ignored,
mode-`0600` local files; it never copies the service-account private key. The
run wrapper supplies those values through `--dart-define-from-file`.

After configuration, opening and running `ios/Runner.xcworkspace` directly in
Xcode also receives the local Firebase defines through
`ios/Flutter/FirebaseLocal.xcconfig`. Run `flutter run` without the wrapper only
when intentionally testing the guest/unconfigured experience.

The production API is the default. Point a debug build at another backend with:

```bash
./tool/run_with_firebase.sh \
  --dart-define=MATHSOLVER_API_BASE_URL=http://localhost:3000
```

For an iOS simulator, use the Mac host address instead of `localhost` when
needed. Android Emulator commonly uses `http://10.0.2.2:3000`.

For CI/release builds, inject the platform keys directly or provide an ignored
JSON file with the same names:

```bash
flutter run \
  --dart-define=MATHSOLVER_FIREBASE_IOS_API_KEY=your_public_ios_api_key \
  --dart-define=MATHSOLVER_FIREBASE_ANDROID_API_KEY=your_public_android_api_key
```

The older `MATHSOLVER_FIREBASE_API_KEY` remains a fallback for existing CI
configuration, but platform-specific keys avoid iOS/Android application
restriction mismatches. Do not hard-code any key or add it to a tracked file. A
build without a matching key keeps guest solving fully usable and presents an
honest preview of account-only video benefits.

Firebase's public project/app identifiers are checked in; the API key is not.
Debug App Check uses debug providers, while release builds use platform
attestation. Register simulator/CI debug tokens only in the Firebase console
and never commit them.

## Architecture

```text
lib/
  core/
    analytics/    Opt-in, no-content Firebase Analytics adapter
    auth/         Verified Email/Password session and token refresh
    config/       Runtime API and Firebase configuration
    network/      Versioned mobile API, notebook sync, and video clients
    security/     Firebase initialization and App Check token headers
    storage/      Guest-first local notebook, review queue, and preferences
    theme/        Light-first Material 3 tokens
    widgets/      Shared math, input, and layout components
  features/
    app/          App state coordinator
    onboarding/   Single-screen first run
    home/         Adaptive three-destination shell
    solve/        Crop/capture, OCR, streaming solution, verify, and follow-ups
    work_check/   Multimodal handwritten-attempt diagnosis
    notebook/     Combined solution and video library
    practice/     Generated quizzes and daily warm-up
    profile/      Account, progress, privacy, and appearance
    video/        Video job models, rendering states, player, and checkpoints
```

The client uses the App-Check-aware mobile gateway:

- `POST /api/mobile/v1/ocr`
- `POST /api/mobile/v1/solve`
- `POST /api/mobile/v1/practice`
- `POST /api/mobile/v1/check-work`
- `POST /api/mobile/v1/verify`
- `POST /api/mobile/v1/feedback`
- `POST|GET /api/mobile/v1/video/jobs`
- `GET|DELETE /api/mobile/v1/video/jobs/:id`
- `POST|DELETE /api/mobile/v1/devices`

Every request carries App Check when available. Account-owned requests also
attach fresh Firebase ID tokens and preserve the backend's verified-account,
ownership, idempotency, quota, signed-media, and deletion rules. Rendering
continues server-side when the app closes or the student navigates away.

## Release boundaries

The code-controlled learning product is implemented. Store credentials and
business decisions are intentionally not fabricated in source control. Follow
[`RELEASE.md`](RELEASE.md) for Apple/Google signing, APNs, App Check rollout,
backend deployment, and store QA. Native Google/Apple login, RevenueCat
products, widgets, Pencil input, live tutoring, and exam packs remain later
product scope; verified Email/Password and all free learning flows work without
them.

Never commit service accounts, API keys, signing keys, or store credentials.
