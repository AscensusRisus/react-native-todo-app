import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, firebaseSetupError } from "./firebase";

type AuthContextType = {
  user: User | null;
  isLoadingUser: boolean;
  setupError: string | null;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readableError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already uses this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "That email or password is not correct.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Check your internet connection and try again.",
  };
  return messages[code] ?? (error instanceof Error ? error.message.replace("Firebase: ", "") : fallback);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsLoadingUser(false);
      return;
    }
    const activeAuth = auth;
    return onAuthStateChanged(activeAuth, (nextUser) => {
      if (nextUser && !nextUser.emailVerified) {
        setUser(null);
        setIsLoadingUser(false);
        firebaseSignOut(activeAuth).catch(() => undefined);
        return;
      }
      setUser(nextUser);
      setIsLoadingUser(false);
    });
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!auth) return firebaseSetupError ?? "Firebase is unavailable.";
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(credential.user);
      await firebaseSignOut(auth);
      return null;
    } catch (error) {
      return readableError(error, "Could not create the account.");
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!auth) return firebaseSetupError ?? "Firebase is unavailable.";
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user).catch(() => undefined);
        await firebaseSignOut(auth);
        return "Verify your email before signing in. We sent you a fresh verification link.";
      }
      return null;
    } catch (error) {
      return readableError(error, "Could not sign in.");
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) return firebaseSetupError ?? "Firebase is unavailable.";
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return null;
    } catch (error) {
      return readableError(error, "Could not send a password-reset email.");
    }
  };

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isLoadingUser, setupError: firebaseSetupError, signUp, signIn, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside of the AuthProvider");
  return context;
}
