"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore/lite";

type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0,
);

let firebaseClient: FirebaseClient | null = null;

export function getFirebaseClient(): FirebaseClient | null {
  if (!isFirebaseConfigured) return null;
  if (firebaseClient) return firebaseClient;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firebaseClient = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };

  return firebaseClient;
}
