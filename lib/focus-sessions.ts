import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db, firebaseSetupError } from "./firebase";
import type { FocusSessionDraft, IntervalKind } from "./focus-domain";

export type FocusSession = Omit<FocusSessionDraft, "id" | "startedAtMs" | "endedAtMs"> & { id: string };

function sessionsCollection(userId: string) {
  if (!db) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  return collection(db, "users", userId, "focusSessions");
}

function fromSnapshot(id: string, data: Record<string, unknown>): FocusSession | null {
  const kind = data.kind;
  if (kind !== "focus" && kind !== "shortBreak" && kind !== "longBreak") return null;
  if (data.status !== "completed" && data.status !== "interrupted") return null;
  return {
    id, kind: kind as IntervalKind, status: data.status, taskId: typeof data.taskId === "string" ? data.taskId : null,
    taskTitleSnapshot: typeof data.taskTitleSnapshot === "string" ? data.taskTitleSnapshot : null,
    intention: typeof data.intention === "string" ? data.intention : "", plannedSeconds: Number(data.plannedSeconds) || 0,
    focusedSeconds: Number(data.focusedSeconds) || 0, localDate: typeof data.localDate === "string" ? data.localDate : "",
  };
}

export async function saveFocusSession(userId: string, session: FocusSessionDraft) {
  const ref = doc(sessionsCollection(userId), session.id);
  await setDoc(ref, {
    taskId: session.taskId, taskTitleSnapshot: session.taskTitleSnapshot, intention: session.intention,
    kind: session.kind, status: session.status, plannedSeconds: session.plannedSeconds, focusedSeconds: session.focusedSeconds,
    localDate: session.localDate, startedAt: Timestamp.fromMillis(session.startedAtMs), endedAt: Timestamp.fromMillis(session.endedAtMs), createdAt: serverTimestamp(),
  });
}

export function subscribeToFocusSessions(userId: string, onChange: (sessions: FocusSession[]) => void, onError: (message: string) => void) {
  return onSnapshot(query(sessionsCollection(userId), orderBy("endedAt", "desc")), (snapshot) => onChange(snapshot.docs.map((item) => fromSnapshot(item.id, item.data())).filter((item): item is FocusSession => item !== null)), (error) => onError(error.message.replace("FirebaseError: ", "")));
}
