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

- Supply `MATHSOLVER_FIREBASE_API_KEY` through CI or `--dart-define`.
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
- Confirm App Attest, Push Notifications, and the production
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
- If native Google or Apple sign-in is added, configure their OAuth clients and
  entitlements first. Email/Password registration, verification, resend,
  password reset, secure refresh, and sign-out are complete.
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
path, and poor/offline network recovery.
