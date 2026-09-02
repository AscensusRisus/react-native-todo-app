# React Native Todo App

React Native Todo App is a calm, cross-platform task and routine tracker for people who want a lightweight daily view without turning their day into a spreadsheet. It is built with Expo and React Native, with Firebase providing account authentication and private cloud data.

Users create an account, verify their email, then organise routines and one-time tasks around a simple daily workflow: see what is due, mark it complete, and review recent consistency.

## Features

- Email/password sign-up, email verification, sign-in, and password reset
- Private Firestore task data scoped to the signed-in user
- Create, edit, complete, and delete tasks
- Optional notes, categories, and low/normal/high priority
- Daily, weekday, weekend, and one-time schedules
- Due dates with upcoming and overdue states
- Today progress, task filters, seven-day activity, and streak summaries
- Task-connected Focus timer with 25-minute focus, 5-minute short-break, and 15-minute long-break intervals
- Timestamp-based countdown recovery after backgrounding or restarting the app on the same device
- Private, immutable focus-session history with retry-safe local syncing when a connection is unavailable
- Responsive mobile-first layout for Android and iOS

## Tech stack

- Expo and React Native
- Expo Router for navigation
- React Native Paper for UI components
- Firebase Authentication and Cloud Firestore
- AsyncStorage-backed Firebase Auth persistence on native devices
- TypeScript, ESLint, and Jest

## Project structure

```text
app/                 Screens and Expo Router routes
components/          Reusable UI, including the task form and task card
hooks/               Firestore subscription hooks
lib/task-domain.ts   Scheduling, validation, due-date, and streak rules
lib/focus-domain.ts  Timestamp-derived timer state and focus-session rules
lib/habits.ts        Firestore task CRUD operations
lib/firebase*.ts     Web and native Firebase configuration
__tests__/           Unit tests for task-domain rules
```

## Run locally

### Prerequisites

- Node.js and npm
- Expo Go on an Android or iOS device
- A Firebase project with Email/Password Authentication and Firestore enabled

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

3. Copy the rules from [firestore.rules](./firestore.rules) into **Firestore Database → Rules** in the Firebase Console and publish them.

4. Start Expo:

   ```bash
   npm run start
   ```

5. Scan the QR code with Expo Go while the phone and computer are on the same Wi-Fi network.

The `EXPO_PUBLIC_FIREBASE_*` values are client configuration values. Never add a Firebase Admin SDK service-account key to this app or commit `.env.local`.

## Quality checks

```bash
npm run verify
```

This runs TypeScript checking, Expo linting, and unit tests covering task scheduling plus timestamp-derived focus timer behavior.

## Current scope

Focus intervals are local to the current device while active; they are not live-controlled across devices. The app does not use notifications or keep-awake behavior, so timer correctness comes from its stored deadline rather than the app staying open. Focus sessions retry locally after a temporary Firestore failure. The app intentionally does not yet include shared lists, a released store build, or automated Firebase security-rule tests.

## Real-device checklist

Before publishing or recording a demo:

1. Register and verify a new account.
2. Close and reopen Expo Go; confirm the verified session persists.
3. Create, edit, complete, and delete tasks across each schedule type.
4. Confirm that a second account cannot read the first account's tasks.
5. Re-publish Firestore rules after every schema change.
6. Start a focus round, background or lock the device, then return and confirm the timestamp-derived remaining time.
7. Pause a focus round, force-close Expo Go, reopen it with the same account, and confirm the paused value is restored.
8. Test a finished round while offline, reconnect, and confirm one focus session eventually appears in Firestore.
