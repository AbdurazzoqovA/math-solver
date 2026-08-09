# App Store Connect handoff — iOS 1.0.0

This file records source-verified metadata and the owner-controlled answers that
must not be guessed. It is a handoff, not approval to submit or add the version
for review.

## Record

- Platform: iOS
- Bundle ID: `io.mathsolver.app`
- Version/build: `1.0.0 (1)`
- SKU: `mathsolver-ios`
- Apple ID: `6799652720`
- Primary language: English (U.S.)
- App name: `AI Math Solver – MathSolver` (27/30 characters; approved by the
  owner and created in App Store Connect on August 9, 2026). `MathSolver` and
  `AI Math Solver: Homework Help` were rejected by Apple's final creation
  check as already in use.
- Subtitle: `Homework Help, Check & Videos` (29/30 characters)
- Primary category: Education
- Apple age rating: 4+ (calculated from the app's math-only content; no Kids
  Category or higher-age override)
- Price: Free
- Privacy URL: `https://math-solver.io/privacy`
- Privacy choices/account deletion URL: `https://math-solver.io/account-deletion`
- Marketing URL: `https://math-solver.io`
- Support URL: `https://math-solver.io` (the homepage exposes the support email)

## Promotional text

Scan, type, or paste a math problem. Learn with clear checked steps, review your
work, practice the idea, and create up to 10 private video lessons each day.

## Description

MathSolver is a free math tutor built to help you understand the work, not just
copy an answer.

Scan a problem with your camera, choose a photo, paste a question, or type it
directly. MathSolver streams a clear step-by-step explanation and lets you
reveal the reasoning at your own pace.

WHAT YOU CAN DO

• Solve algebra, calculus, geometry, statistics, and many other math problems
• Learn from clear step-by-step explanations
• Check handwritten work and find the first incorrect line
• Practice with questions based on the idea you just learned
• Review mistakes on a spaced schedule
• Create private animated video explanations for your exact problem
• Save video and captions for offline viewing
• Keep a private synced notebook with an optional verified account

FREE BY DESIGN

Written solving, scanning, Check My Work, practice, review, and notebook
features are free with no product usage limit. Verified accounts can generate
up to 10 videos per UTC day. There is no subscription, paid plan, trial,
purchase gate, or upgrade prompt.

YOUR CHOICES

Core solving works without an account. Notifications are optional and are
offered only after you start a video; choosing Not now never blocks the lesson.
Anonymous mobile analytics are off by default and can be changed in Profile.
Signed-in users can delete individual private videos or permanently delete
their account and associated data in the app.

MathSolver uses AI and can make mistakes. Double-check important work.

## Keywords

`algebra,calculus,geometry,trigonometry,statistics,calculator,equation,tutor,study,school,exam,quiz`

## Approved screenshots

Uploaded in the numbered order shown on August 9, 2026.

- 6.9-inch iPhone: `mobile_app/screenshots/final-v2-5/` — five RGB PNGs,
  1290×2796. `mobile_app/screenshots/final/` is byte-identical.
- 13-inch iPad: `mobile_app/screenshots/final-ipad-13/` — five RGB PNGs,
  2064×2752.

Both slots are ordered: Solve, Learn, Check Work, Video, Practice. App Store
Connect uses the 6.9-inch set for other iPhone sizes and the 13-inch set for
other iPad sizes.

## Saved release configuration

- Price schedule: `$0.00` in all 175 App Store price regions.
- Distribution method: public/discoverable (Apple's default).
- Apple silicon Mac and Apple Vision Pro compatibility: off until those
  devices have been tested.
- Release mode: manual.
- Standard Apple license agreement.
- App Review notes explain guest solving, verified-account video access, the
  10/day video rule, contextual permissions, deletion, and AI accuracy.
- Availability: all 175 current App Store countries or regions, including
  future regions as Apple adds them.
- Copyright: `2026 CHAKO LTD`.
- Owner-provided App Review contact information is saved in App Store Connect.
- A dedicated `app-review@math-solver.io` Firebase account was created with a
  verified email, its live password sign-in was tested, and the credentials are
  stored only in App Store Connect—not in this repository.
- `ITSAppUsesNonExemptEncryption` is `false`; the app uses platform-provided
  HTTPS/TLS and Keychain-backed secure storage, not custom or non-exempt
  cryptography.

## App privacy configuration

The following source-verified disclosures were published in App Store Connect
on August 9, 2026 after the owner explicitly approved Apple's accuracy,
guideline, and applicable-law attestation.

- Contact Info → Email Address: optional account; linked to the user; app
  functionality.
- User Content → Photos and Other User Content: math photos/text are sent for
  requested OCR/solving; app functionality. Account notebook text is linked to
  a signed-in user; guest requests are not tied to an account.
- Identifiers → User ID: optional Firebase account; linked to the user; app
  functionality.
- Identifiers → Device ID: notification token/platform/app version only after
  notification opt-in, plus the opt-in analytics app instance identifier;
  linked to the signed-in user; app functionality and analytics.
- Usage Data → Product Interaction: only after the separate mobile analytics
  opt-in; not linked to identity; analytics; never contains math content.
- Tracking: No. No advertising identifier or cross-company tracking SDK ships.
- No contacts, financial information, health data, microphone input, or precise
  location is requested by the iOS app.

## Owner-controlled fields still required

- Export-compliance answers.
- Content-rights attestation.
- Apple Distribution certificate/profile and an archive signed by Team
  `UGWY3X7QR2` with App Attest and Push Notifications entitlements.
- APNs `.p8` upload to Firebase Cloud Messaging: key file, Key ID, and Team ID.
- Production `MATHSOLVER_FIREBASE_IOS_API_KEY` injection and real-device App
  Check/notification QA before setting `MOBILE_APP_CHECK_ENFORCED=true`.

Do not Add for Review, submit for review, or release without a new explicit
owner approval.
