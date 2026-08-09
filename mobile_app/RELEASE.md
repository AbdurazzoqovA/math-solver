# Mobile release checklist

The app code is production-shaped, but a store release still needs
owner-controlled credentials, console settings, and an intentional backend
rollout. Never commit any value from this checklist.

Backend status on 2026-07-28: the Next.js mobile gateway, private renderer, and
Firestore rules are deployed. App Check remains in the deliberate observation
state (`MOBILE_APP_CHECK_ENFORCED` unset/false): invalid supplied tokens are
rejected, while a token is not yet mandatory until real-device/debug traffic is
validated.

## 1. Build configuration

- Supply `MATHSOLVER_FIREBASE_IOS_API_KEY` and
  `MATHSOLVER_FIREBASE_ANDROID_API_KEY` through CI or an ignored
  `--dart-define-from-file` JSON. The legacy `MATHSOLVER_FIREBASE_API_KEY`
  remains a compatibility fallback.
- Generate the ignored local configuration with
  `node tool/configure_firebase.mjs`, or provide the Google iOS/server client
  IDs, Android provider flag, Apple provider flag, and iOS reversed-client-ID
  Xcode setting described in `README.md` through private CI configuration.
- Optionally set `MATHSOLVER_API_BASE_URL`; production defaults to
  `https://math-solver.io`.
- Register Firebase App Check debug tokens for simulator/CI builds. Release
  builds use App Attest with DeviceCheck fallback on iOS and Play Integrity on
  Android.

## 2. Apple

- Create the App Store Connect record for bundle ID `io.mathsolver.app`.
- Add the Apple Distribution certificate and provisioning profile in the
  private CI keychain.
- Upload the owner-held APNs `.p8` key to Firebase Cloud Messaging. Messaging
  auto-init is off; after the learner starts a video, the app requests
  permission, registers the FCM token, and deep-links ready notifications to
  the exact private lesson. Manual sign-out unregisters and deletes the local
  token. iOS delivery cannot work until the APNs key is configured.
- Sign in with Apple is enabled for `io.mathsolver.app`; its Services ID,
  Firebase callback, Firebase provider, and dedicated private key were
  configured on 2026-08-05. Keep the one-time-downloaded `.p8` backed up outside
  the repository and rotate the Firebase provider if that key is replaced.
- Confirm App Attest, Sign in with Apple, Push Notifications, and the production
  `aps-environment` entitlement in the signed archive.
- Complete the age rating and privacy nutrition labels using the policy below:
  no advertising identifier, no contacts/location, analytics off by default,
  and no math/photo/answer/account data in analytics or notifications.

## 3. Google Play

- Create a private upload keystore. Put it outside the repository and add
  ignored `android/key.properties` with:

  ```properties
  storePassword=...
  keyPassword=...
  keyAlias=...
  storeFile=/absolute/path/to/upload-keystore.jks
  ```

- Link the Play app to Firebase, opt into Play App Signing, and confirm Play
  Integrity recognizes the release certificate.
- The local Android debug SHA-1/SHA-256 fingerprints are registered for Google
  sign-in. Register the upload and Play App Signing fingerprints after the
  private release keystore and Play record exist.
- `build.gradle.kts` never uses the debug certificate for release: it signs
  from the ignored properties when present and otherwise leaves the artifact
  unsigned.

## 4. Backend rollout

1. Deployed: Next.js `/api/mobile/v1/*`, Check My Work,
   verification/reporting, and device registration.
2. Deployed: private renderer with video-ready FCM delivery.
3. Published: Firestore rules; device tokens and their ownership registry are
   server-only.
4. Start with `MOBILE_APP_CHECK_ENFORCED=false`. Invalid supplied tokens are
   still rejected, while older/debug builds can be observed safely.
5. Monitor App Check metrics, register legitimate debug/CI tokens, then set
   `MOBILE_APP_CHECK_ENFORCED=true` before public store distribution.

The Firebase iOS and Android apps, App Attest/Play Integrity providers, App
Check API, FCM API, token-verifier IAM, and renderer's narrow FCM sender role
are already configured.

## 5. Product/store decisions

- Do not add a paywall until products, regional pricing, refund/support policy,
  and the exact free video allowance are approved. Core steps, Check My Work,
  practice, and mistake review remain free.
- Native Google and Apple sign-in plus Email/Password registration,
  verification, resend, password reset, native session refresh, and sign-out
  are complete. Preserve the Apple provider key and add Android release
  fingerprints when distribution signing is created.
- RevenueCat, widgets, iPad Pencil scratchpad, Live Tutor, and exam packs are
  roadmap items, not hidden launch dependencies.

## 6. Verification

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --simulator --debug
```

Before submission, repeat the critical flows on real iOS and Android devices:
permission denial/retry, camera crop and worksheet selection, OCR correction,
streamed solve, Check My Work, verification/report, review scheduling, account
merge, offline video, sharing, notification deep link, account deletion/support
path, Google sign-in, Sign in with Apple, and poor/offline network recovery.
