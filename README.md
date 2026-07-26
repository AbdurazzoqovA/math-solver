# MathSolver

MathSolver is a free, no-login web math solver with streamed step-by-step
solutions, photo/PDF/drawing OCR, focused calculator pages, and generated
practice tests with scheduled mistake review and a local-first daily streak.

## Local development

```bash
npm install
cp .env.example .env.local
# Set the server-only GOOGLE_CLOUD_API_KEY.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Firebase is optional in local development. Without Firebase configuration, the
app keeps its original browser-only `localStorage` notebook and does not render
account controls.

The blog uses a server-only Pressroom integration. Set `PRESSROOM_API_KEY` in
`.env.local`; never expose it through a `NEXT_PUBLIC_*` variable. `/blog`,
`/blog?page=N`, article metadata, and `/blog/{slug}` are rendered on the server,
while Pressroom responses are revalidated every five minutes. Production
Cloud Run must receive the same variable at runtime.

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

The Firebase setup includes:

1. A `(default)` Firestore database in Native mode. The existing database is in
   multi-region `nam5`; preserve this durable location.
2. Verify Email/Password and Google providers in Firebase Authentication.
3. Register or reuse the Web app and add `math-solver.io` to Authentication's
   authorized domains.
4. Copy `.env.example` to `.env.local` and fill in the confirmed public Web app
   configuration.
5. Authenticate the Firebase CLI as a project owner and deploy the checked-in
   verified-owner-only rules:

```bash
npx firebase-tools deploy --only firestore:rules --project math-solver-e3a55
```

Current live state (2026-07-26):

- The Firebase project and registered Web app are active, and the ignored local
  Web config exactly matches the registered app.
- Email/Password and Google Auth are enabled.
- `math-solver.io` is an authorized Auth domain.
- Email/Password registration, verification/resend, password-reset requests,
  and temporary-user cleanup passed live API tests. Google is enabled; its
  interactive popup still requires one manual browser click-through.
- The `(default)` Firestore Native database is active in `nam5`.
- The owner published `firestore.rules`. Live verified-owner chat and deletion
  tombstone create/read/update/delete pass; unverified, cross-user, anonymous,
  and malformed operations are denied.

### Direct email action handling

MathSolver handles Firebase email actions at `/auth/action`. The route applies
email-verification and email-recovery codes, provides the password-reset form,
rejects unsafe cross-origin continue URLs, and returns to the existing
`/?auth=...` session state.

After this route is deployed, configure Firebase Console → Authentication →
Templates:

1. Open **Email address verification**, choose **Customize action URL**, and set
   `https://math-solver.io/auth/action`.
2. Do the same for **Password reset**. If email-change/recovery emails are
   enabled later, give that template the same action URL.
3. Keep `math-solver.io` in Authentication → Settings → Authorized domains.

No Firebase Hosting custom domain or `linkDomain` is required for this web
flow. `ActionCodeSettings.url` remains the post-action continue URL;
`handleCodeInApp` remains `false`.

Firebase Web configuration values are public project identifiers, not admin
credentials. Access control lives in `firestore.rules`; never put service
account keys or other private credentials in `NEXT_PUBLIC_*` variables.

The sync model is local-first:

- Guests continue using `mathsolver_chats` in `localStorage`.
- On first verified sign-in, guest chats, the account's browser cache, and
  Firestore chats are merged by chat ID and latest update time.
- Email/Password accounts must verify their email before any Firestore read or
  write. Unverified accounts keep working against their device-local cache;
  Google accounts arrive verified.
- Each user's chats live under `/users/{uid}/chats/{chatId}` and can only be
  read or written by that verified Firebase Authentication UID.
- Deletions write private `/users/{uid}/chatDeletions/{chatId}` tombstones so
  an older browser cache cannot resurrect a chat removed on another device.
- Uploaded image data URLs remain browser-local to avoid Firestore's document
  limit. OCR text, solutions, generated tests, and saved practice attempts sync.
- First-attempt mistakes store a compact review schedule on their existing
  question and therefore sync with the verified notebook without duplicating
  problem text.
- Writes wait until streaming finishes and are debounced to avoid writing every
  solver token.

Daily goal/streak progress is intentionally lighter weight: it uses
`mathsolver_learning_progress_v1` for guests and a UID-scoped local key after
sign-in, merging guest activity once. It records only whether `solve`,
`practice`, or `review` occurred on a local calendar day and does not yet sync
across devices.

The sidebar exposes due-review counts and recommends the next daily-goal action.
GA4 retention events use only bounded activity/outcome/count parameters; math
problems, answers, images, emails, Firebase IDs, and notebook IDs are never sent
as event parameters. The event table and dashboard funnel are documented in
`wiki/tech-and-ops.md` and `wiki/growth-strategy.md`.

`NEXT_PUBLIC_*` values are embedded by `next build`. The Dockerfile accepts all
six Firebase values as build arguments, so production builds must pass them
during the image build; setting them only on the running Cloud Run container is
too late.

## Verification

```bash
npx tsc --noEmit
npm run build
npx firebase-tools emulators:exec --only firestore --project demo-mathsolver "node --test tests/firestore.rules.test.mjs"
node --experimental-strip-types --test tests/firebase-auth-actions.test.mjs tests/post-solution-actions.test.mjs tests/learning-progress.test.mjs tests/analytics.test.mjs
```
