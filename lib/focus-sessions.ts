import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db, firebaseSetupError } from "./firebase";
import { focusSessionPayload, type FocusSessionDraft, type IntervalKind } from "./focus-domain";

export type FocusSession = Omit<FocusSessionDraft, "id" | "startedAtMs" | "endedAtMs"> & { id: string; endedAtMs?: number };

export function focusSessionFields(session: FocusSessionDraft) {
  const payload = focusSessionPayload(session);
  return {
    taskId: payload.taskId, taskTitleSnapshot: payload.taskTitleSnapshot, intention: payload.intention,
    kind: payload.kind, status: payload.status, plannedSeconds: payload.plannedSeconds, focusedSeconds: payload.focusedSeconds,
    localDate: payload.localDate, startedAt: Timestamp.fromMillis(payload.startedAtMs), endedAt: Timestamp.fromMillis(payload.endedAtMs), createdAt: serverTimestamp(),
  };
}

function sessionsCollection(userId: string) {
  if (!db) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  return collection(db, "users", userId, "focusSessions");
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

export async function saveFocusSession(userId: string, session: FocusSessionDraft) {
  const ref = doc(sessionsCollection(userId), session.id);
  await setDoc(ref, focusSessionFields(session));
}

export function subscribeToFocusSessions(userId: string, onChange: (sessions: FocusSession[]) => void, onError: (message: string) => void) {
  return onSnapshot(query(sessionsCollection(userId), orderBy("endedAt", "desc")), (snapshot) => onChange(snapshot.docs.map((item) => fromSnapshot(item.id, item.data())).filter((item): item is FocusSession => item !== null)), (error) => onError(error.message.replace("FirebaseError: ", "")));
}
