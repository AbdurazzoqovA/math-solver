# MathSolver

MathSolver is a free, no-login web math solver with streamed step-by-step
solutions, photo/PDF/drawing OCR, focused calculator pages, and generated
practice tests.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Firebase is optional in local development. Without Firebase configuration, the
app keeps its original browser-only `localStorage` notebook and does not render
account controls.

## Firebase account and notebook sync

The owner-confirmed production architecture uses two separate Google Cloud
projects:

- `axial-willow-428621-n4` is the existing Cloud Run build/hosting project in
  `us-central1`.
- `math-solver-e3a55` is the Firebase Authentication and Firestore data project.

`.firebaserc` defaults Firebase CLI operations to `math-solver-e3a55` and keeps
an explicit non-default alias for the Cloud Run infrastructure project. Do not
move Cloud Run resources or server-side AI configuration into the Firebase
project.

The Firebase setup must include:

1. Create or verify a Firestore database in Native mode. Choose the region
   deliberately; it cannot be changed later, and the current Cloud Run service
   is in `us-central1`.
2. Verify Email/Password and Google providers in Firebase Authentication.
3. Register or reuse the Web app and add `math-solver.io` to Authentication's
   authorized domains.
4. Copy `.env.example` to `.env.local` and fill in the confirmed public Web app
   configuration.
5. Authenticate the Firebase CLI as a project owner and deploy the checked-in
   owner-only rules:

```bash
npx firebase-tools deploy --only firestore:rules --project math-solver-e3a55
```

Current live state (2026-07-26):

- The Firebase project and registered Web app are active, and the ignored local
  Web config exactly matches the registered app.
- Email/Password and Google Auth are enabled.
- `math-solver.io` is an authorized Auth domain.
- A temporary Email/Password user completed a live create/sign-in/delete test.
- Firestore is still blocked: `firestore.googleapis.com` is disabled, and the
  supplied Firebase Admin SDK service account does not have Service Usage
  permission to enable it. A project owner must enable that API (or grant
  Service Usage Admin), after which the `(default)` Native database can be
  created in `us-central1` and `firestore.rules` deployed.

Firebase Web configuration values are public project identifiers, not admin
credentials. Access control lives in `firestore.rules`; never put service
account keys or other private credentials in `NEXT_PUBLIC_*` variables.

The sync model is local-first:

- Guests continue using `mathsolver_chats` in `localStorage`.
- On first sign-in, guest chats, the account's browser cache, and Firestore
  chats are merged by chat ID and latest update time.
- Each user's chats live under `/users/{uid}/chats/{chatId}` and can only be
  read or written by that Firebase Authentication UID.
- Deletions write private `/users/{uid}/chatDeletions/{chatId}` tombstones so
  an older browser cache cannot resurrect a chat removed on another device.
- Uploaded image data URLs remain browser-local to avoid Firestore's document
  limit. OCR text, solutions, generated tests, and saved practice attempts sync.
- Writes wait until streaming finishes and are debounced to avoid writing every
  solver token.

`NEXT_PUBLIC_*` values are embedded by `next build`. The Dockerfile accepts all
six Firebase values as build arguments, so production builds must pass them
during the image build; setting them only on the running Cloud Run container is
too late.

## Verification

```bash
npx tsc --noEmit
npm run build
npx firebase-tools emulators:exec --only firestore --project demo-mathsolver "node --test tests/firestore.rules.test.mjs"
```
