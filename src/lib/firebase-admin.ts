import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class VideoAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "VideoAuthError";
  }
}

function getAdminProjectId(): string {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing FIREBASE_ADMIN_PROJECT_ID");
  }
  return projectId;
}

function getCredential() {
  const inlineCredential = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!inlineCredential) return applicationDefault();

  let parsed: unknown;
  try {
    parsed = JSON.parse(inlineCredential);
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is invalid");
  }
  return cert(parsed as Parameters<typeof cert>[0]);
}

export function getFirebaseAdminApp(): App {
  const existing = getApps().find((app) => app.name === "mathsolver-server");
  if (existing) return existing;

  return initializeApp(
    {
      credential: getCredential(),
      projectId: getAdminProjectId(),
      storageBucket: process.env.VIDEO_STORAGE_BUCKET,
    },
    "mathsolver-server",
  );
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}

type VerifiedRequestMessages = {
  authenticationRequired: string;
  invalidSession: string;
  emailVerificationRequired: string;
};

const VIDEO_AUTH_MESSAGES: VerifiedRequestMessages = {
  authenticationRequired: "Sign in to generate a video explanation.",
  invalidSession: "Your session expired. Sign in again and retry.",
  emailVerificationRequired:
    "Verify your email before generating a video explanation.",
};

const ACCOUNT_AUTH_MESSAGES: VerifiedRequestMessages = {
  authenticationRequired: "Sign in to manage your account.",
  invalidSession: "Your session expired. Sign in again and retry.",
  emailVerificationRequired: "Verify your email before managing your account.",
};

function readBearerToken(
  request: Request,
  messages: VerifiedRequestMessages,
): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new VideoAuthError(
      messages.authenticationRequired,
      401,
      "authentication_required",
    );
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new VideoAuthError(
      messages.authenticationRequired,
      401,
      "authentication_required",
    );
  }
  return token;
}

async function verifyVerifiedRequest(
  request: Request,
  messages: VerifiedRequestMessages,
): Promise<DecodedIdToken> {
  const token = readBearerToken(request, messages);

  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch {
    throw new VideoAuthError(
      messages.invalidSession,
      401,
      "invalid_session",
    );
  }

  if (decoded.email_verified !== true) {
    throw new VideoAuthError(
      messages.emailVerificationRequired,
      403,
      "email_verification_required",
    );
  }

  return decoded;
}

export function verifyVideoRequest(
  request: Request,
): Promise<DecodedIdToken> {
  return verifyVerifiedRequest(request, VIDEO_AUTH_MESSAGES);
}

export function verifyAccountRequest(
  request: Request,
): Promise<DecodedIdToken> {
  return verifyVerifiedRequest(request, ACCOUNT_AUTH_MESSAGES);
}
