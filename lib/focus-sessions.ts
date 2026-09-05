import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, Timestamp, type Firestore } from "firebase/firestore";
import { db, firebaseSetupError } from "./firebase";
import { readableDataError } from "./error-messages";
import { focusSessionPayload, sameFocusSessionContent, validateFocusSessionDraft, type FocusSessionDraft, type IntervalKind } from "./focus-domain";

export type FocusSession = Omit<FocusSessionDraft, "id" | "startedAtMs" | "endedAtMs"> & { id: string; endedAtMs?: number };

const retryableCodes = new Set(["aborted", "deadline-exceeded", "internal", "resource-exhausted", "unavailable"]);

export class FocusSessionSaveError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = "FocusSessionSaveError";
    this.code = code;
    this.retryable = retryable;
  }
}

const errorCode = (cause: unknown) => {
  if (!cause || typeof cause !== "object") return "unknown";
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" ? code.replace(/^firebase\//, "") : "unknown";
};

const errorMessage = (cause: unknown) => readableDataError(cause, "Could not save the focus session.");

export function isRetryableFocusSessionError(cause: unknown): cause is FocusSessionSaveError {
  return cause instanceof FocusSessionSaveError && cause.retryable;
}

export function focusSessionSaveMessage(cause: unknown) {
  if (cause instanceof FocusSessionSaveError) return cause.message;
  return errorMessage(cause);
}

export function focusSessionFields(session: FocusSessionDraft) {
  const payload = focusSessionPayload(session);
  return {
    taskId: payload.taskId, taskTitleSnapshot: payload.taskTitleSnapshot, intention: payload.intention,
    kind: payload.kind, status: payload.status, plannedSeconds: payload.plannedSeconds, focusedSeconds: payload.focusedSeconds,
    localDate: payload.localDate, startedAt: Timestamp.fromMillis(payload.startedAtMs), endedAt: Timestamp.fromMillis(payload.endedAtMs), createdAt: serverTimestamp(),
  };
}

function matchesStoredSession(session: FocusSessionDraft, data: Record<string, unknown>) {
  const stored = validateFocusSessionDraft({
    id: session.id,
    taskId: data.taskId === null ? null : typeof data.taskId === "string" ? data.taskId : undefined,
    taskTitleSnapshot: data.taskTitleSnapshot === null ? null : typeof data.taskTitleSnapshot === "string" ? data.taskTitleSnapshot : undefined,
    intention: data.intention,
    kind: data.kind,
    status: data.status,
    plannedSeconds: data.plannedSeconds,
    focusedSeconds: data.focusedSeconds,
    localDate: data.localDate,
    startedAtMs: data.startedAt instanceof Timestamp ? data.startedAt.toMillis() : undefined,
    endedAtMs: data.endedAt instanceof Timestamp ? data.endedAt.toMillis() : undefined,
  });
  return stored !== null && sameFocusSessionContent(session, stored);
}

function sessionsCollection(userId: string, firestore: Firestore | null = db) {
  if (!firestore) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  return collection(firestore, "users", userId, "focusSessions");
}

function fromSnapshot(id: string, data: Record<string, unknown>): FocusSession | null {
  const kind = data.kind;
  if (kind !== "focus" && kind !== "shortBreak" && kind !== "longBreak") return null;
  if (data.status !== "completed" && data.status !== "interrupted") return null;
  const endedAtMs = data.endedAt instanceof Timestamp ? data.endedAt.toMillis() : undefined;
  return {
    id, kind: kind as IntervalKind, status: data.status, taskId: typeof data.taskId === "string" ? data.taskId : null,
    taskTitleSnapshot: typeof data.taskTitleSnapshot === "string" ? data.taskTitleSnapshot : null,
    intention: typeof data.intention === "string" ? data.intention : "", plannedSeconds: Number(data.plannedSeconds) || 0,
    focusedSeconds: Number(data.focusedSeconds) || 0, localDate: typeof data.localDate === "string" ? data.localDate : "", endedAtMs,
  };
}

export async function saveFocusSession(userId: string, session: FocusSessionDraft, firestore: Firestore | null = db) {
  if (!firestore) throw new FocusSessionSaveError(firebaseSetupError ?? "Firebase is unavailable.", "setup", false);
  const ref = doc(sessionsCollection(userId, firestore), session.id);
  try {
    await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists()) {
        if (!matchesStoredSession(session, snapshot.data())) throw new FocusSessionSaveError("This focus session ID already contains different data and was not overwritten.", "conflict", false);
        return;
      }
      transaction.set(ref, focusSessionFields(session));
    });
  } catch (cause) {
    if (cause instanceof FocusSessionSaveError) throw cause;
    const code = errorCode(cause);
    throw new FocusSessionSaveError(errorMessage(cause), code, retryableCodes.has(code));
  }
}

export function subscribeToFocusSessions(userId: string, onChange: (sessions: FocusSession[]) => void, onError: (message: string) => void) {
  return onSnapshot(query(sessionsCollection(userId), orderBy("endedAt", "desc")), (snapshot) => onChange(snapshot.docs.map((item) => fromSnapshot(item.id, item.data())).filter((item): item is FocusSession => item !== null)), (error) => onError(readableDataError(error, "Could not load your focus history.")));
}
