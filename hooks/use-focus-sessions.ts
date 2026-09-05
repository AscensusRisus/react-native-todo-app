import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useTodayKey } from "@/hooks/use-today-key";
import { FOCUS_PENDING_STORAGE_KEY, mergeFocusSessionsById, validateFocusSessionDraft } from "@/lib/focus-domain";
import { focusPendingStorageKey, ownedLegacyRecord } from "@/lib/focus-storage";
import { dateKey } from "@/lib/task-domain";
import type { FocusSession } from "@/lib/focus-sessions";
import { subscribeToFocusSessions } from "@/lib/focus-sessions";
import type { FocusSessionDraft } from "@/lib/focus-domain";

type PendingEnvelope = { ownerUid: string; sessions: FocusSessionDraft[] };

async function readStoredPendingSessions(userId: string) {
  const scopedRaw = await AsyncStorage.getItem(focusPendingStorageKey(userId));
  const legacyRaw = scopedRaw === null ? ownedLegacyRecord(await AsyncStorage.getItem(FOCUS_PENDING_STORAGE_KEY), userId) : null;
  const raw = scopedRaw ?? legacyRaw;
  if (!raw) return [];
  try {
    const envelope = JSON.parse(raw) as PendingEnvelope;
    if (envelope.ownerUid !== userId || !Array.isArray(envelope.sessions)) return [];
    return envelope.sessions.map(validateFocusSessionDraft).filter((session): session is FocusSessionDraft => session !== null);
  } catch {
    return [];
  }
}

export function useFocusSessions(userId?: string, pendingSessions: FocusSessionDraft[] = []) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [storedPendingSessions, setStoredPendingSessions] = useState<FocusSessionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = useTodayKey();
  const tomorrow = useMemo(() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + 1);
    return dateKey(date);
  }, [today]);
  useEffect(() => {
    if (!userId) { setSessions([]); return; }
    return subscribeToFocusSessions(userId, (next) => { setSessions(next); setError(null); }, setError, { startLocalDate: today, endExclusiveLocalDate: tomorrow });
  }, [today, tomorrow, userId]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!userId) { setStoredPendingSessions([]); return; }
      try {
        const next = await readStoredPendingSessions(userId);
        if (alive) setStoredPendingSessions(next);
      } catch {
        if (alive) setStoredPendingSessions([]);
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { alive = false; clearInterval(interval); subscription.remove(); };
  }, [userId]);
  const mergedPendingSessions = useMemo(() => mergeFocusSessionsById(pendingSessions, storedPendingSessions), [pendingSessions, storedPendingSessions]);
  const mergedSessions = useMemo(() => mergeFocusSessionsById(sessions, mergedPendingSessions), [mergedPendingSessions, sessions]);
  const summary = useMemo(() => {
    const focus = mergedSessions.filter((session) => session.localDate === today && session.status === "completed" && session.kind === "focus");
    return { rounds: focus.length, focusedMinutes: Math.floor(focus.reduce((total, session) => total + session.focusedSeconds, 0) / 60) };
  }, [mergedSessions, today]);
  return { sessions: mergedSessions, summary, error };
}
