import { useEffect, useMemo, useState } from "react";
import { useTodayKey } from "@/hooks/use-today-key";
import { mergeFocusSessionsById } from "@/lib/focus-domain";
import type { FocusSession } from "@/lib/focus-sessions";
import { subscribeToFocusSessions } from "@/lib/focus-sessions";
import type { FocusSessionDraft } from "@/lib/focus-domain";

export function useFocusSessions(userId?: string, pendingSessions: FocusSessionDraft[] = []) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = useTodayKey();
  useEffect(() => {
    if (!userId) { setSessions([]); return; }
    return subscribeToFocusSessions(userId, (next) => { setSessions(next); setError(null); }, setError);
  }, [userId]);
  const mergedSessions = useMemo(() => mergeFocusSessionsById(sessions, pendingSessions), [pendingSessions, sessions]);
  const summary = useMemo(() => {
    const focus = mergedSessions.filter((session) => session.localDate === today && session.status === "completed" && session.kind === "focus");
    return { rounds: focus.length, focusedMinutes: Math.floor(focus.reduce((total, session) => total + session.focusedSeconds, 0) / 60) };
  }, [mergedSessions, today]);
  return { sessions: mergedSessions, summary, error };
}
