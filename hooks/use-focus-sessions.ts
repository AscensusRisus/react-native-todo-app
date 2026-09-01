import { useEffect, useMemo, useState } from "react";
import { todayKey } from "@/lib/habits";
import type { FocusSession } from "@/lib/focus-sessions";
import { subscribeToFocusSessions } from "@/lib/focus-sessions";

export function useFocusSessions(userId?: string) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) { setSessions([]); return; }
    return subscribeToFocusSessions(userId, (next) => { setSessions(next); setError(null); }, setError);
  }, [userId]);
  const summary = useMemo(() => {
    const today = todayKey();
    const focus = sessions.filter((session) => session.localDate === today && session.status === "completed" && session.kind === "focus");
    return { rounds: focus.length, focusedMinutes: Math.floor(focus.reduce((total, session) => total + session.focusedSeconds, 0) / 60) };
  }, [sessions]);
  return { sessions, summary, error };
}
