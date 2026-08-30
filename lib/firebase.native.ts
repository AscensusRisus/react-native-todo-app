import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import * as FirebaseAuth from "@firebase/auth";
import { getAuth, initializeAuth, type Auth, type Persistence } from "@firebase/auth";

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

type AuthWithReactNativePersistence = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
const getReactNativePersistence = (FirebaseAuth as AuthWithReactNativePersistence).getReactNativePersistence;

export const auth: Auth | null = app
  ? appAlreadyExists
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
