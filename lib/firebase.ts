import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};
const missingKeys = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key);
export const firebaseSetupError = missingKeys.length ? `Firebase is not configured. Add these values to .env.local: ${missingKeys.join(", ")}.` : null;
const appAlreadyExists = getApps().length > 0;
const app = firebaseSetupError ? null : appAlreadyExists ? getApp() : initializeApp(firebaseConfig);

// Web uses Firebase's normal local browser persistence. Native has a sibling
// firebase.native.ts module that uses AsyncStorage instead.
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
