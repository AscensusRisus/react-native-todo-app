const firestoreMessages: Record<string, string> = {
  "permission-denied": "You do not have permission to access this data.",
  unauthenticated: "Your session has expired. Sign in again to continue.",
  unavailable: "Your data is temporarily unavailable. Check your connection and try again.",
  "deadline-exceeded": "The request took too long. Check your connection and try again.",
  "failed-precondition": "This data is not ready yet. Try again in a moment.",
  "not-found": "This item is no longer available.",
};

export function readableDataError(cause: unknown, fallback: string) {
  const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code).replace(/^(firebase|firestore)\//, "") : "";
  if (code && firestoreMessages[code]) return firestoreMessages[code];
  if (cause instanceof Error) return cause.message.replace("FirebaseError: ", "");
  return fallback;
}
