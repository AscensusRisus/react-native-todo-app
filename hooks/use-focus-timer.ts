import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";
import { FOCUS_PENDING_STORAGE_KEY, FOCUS_TIMER_STORAGE_KEY, completedSession, durationFor, interruptedSession, isTimerFinished, pauseTimer, remainingSeconds, resumeTimer, type ActiveTimer, type FocusSessionDraft, type IntervalKind, validateStoredTimer } from "@/lib/focus-domain";
import { saveFocusSession } from "@/lib/focus-sessions";

type PendingEnvelope = { ownerUid: string; sessions: FocusSessionDraft[] };
type StartOptions = { kind: IntervalKind; taskId: string | null; taskTitleSnapshot: string | null; intention: string };

const newIntervalId = () => `focus-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const empty = () => AsyncStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);

export function useFocusTimer(userId?: string) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [finishedTimer, setFinishedTimer] = useState<ActiveTimer | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSessions, setPendingSessions] = useState<FocusSessionDraft[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const timerRef = useRef<ActiveTimer | null>(null);
  const finishingIdRef = useRef<string | null>(null);
  const previousRemainingRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  const setActiveTimer = useCallback(async (next: ActiveTimer | null) => {
    timerRef.current = next;
    setTimer(next);
    if (next) await AsyncStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(next));
    else await empty();
  }, []);

  const readPending = useCallback(async (): Promise<FocusSessionDraft[]> => {
    const raw = await AsyncStorage.getItem(FOCUS_PENDING_STORAGE_KEY);
    if (!raw) return [];
    try {
      const envelope = JSON.parse(raw) as PendingEnvelope;
      if (envelope.ownerUid !== userId || !Array.isArray(envelope.sessions)) {
        await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY);
        return [];
      }
      return envelope.sessions;
    } catch { await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY); return []; }
  }, [userId]);

  const writePending = useCallback(async (sessions: FocusSessionDraft[]) => {
    if (!userId) return;
    setPendingCount(sessions.length);
    setPendingSessions(sessions);
    if (sessions.length) await AsyncStorage.setItem(FOCUS_PENDING_STORAGE_KEY, JSON.stringify({ ownerUid: userId, sessions }));
    else await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY);
  }, [userId]);

  const retryPending = useCallback(async () => {
    if (!userId) return;
    const pending = await readPending();
    if (!pending.length) { setPendingCount(0); return; }
    const remaining: FocusSessionDraft[] = [];
    for (const session of pending) {
      try { await saveFocusSession(userId, session); }
      catch (cause) { remaining.push(session); setSyncError(cause instanceof Error ? cause.message : "Waiting to sync."); }
    }
    await writePending(remaining);
    if (!remaining.length) setSyncError(null);
  }, [readPending, userId, writePending]);

  const enqueueSession = useCallback(async (session: FocusSessionDraft) => {
    const pending = await readPending();
    if (!pending.some((item) => item.id === session.id)) await writePending([...pending, session]);
    void retryPending().catch((cause) => setSyncError(cause instanceof Error ? cause.message : "Waiting to sync."));
  }, [readPending, retryPending, writePending]);

  const finish = useCallback(async (active: ActiveTimer, currentNow = Date.now()) => {
    if (finishingIdRef.current === active.intervalId) return;
    finishingIdRef.current = active.intervalId;
    try {
      await enqueueSession(completedSession(active, currentNow));
      await setActiveTimer(null);
      setFinishedTimer(active);
      setNowMs(currentNow);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void AccessibilityInfo.announceForAccessibility("Timer complete. Choose your next step.");
    } catch (cause) {
      finishingIdRef.current = null;
      setSyncError(cause instanceof Error ? cause.message : "Could not save the completed timer yet.");
    }
  }, [enqueueSession, setActiveTimer]);

  const checkTimer = useCallback(async (currentNow = Date.now()) => {
    const active = timerRef.current;
    setNowMs(currentNow);
    if (!active) return;
    const remaining = remainingSeconds(active, currentNow);
    const previous = previousRemainingRef.current;
    const wasRecentlyTicking = lastTickAtRef.current !== null && currentNow - lastTickAtRef.current <= 3_000;
    if (active.phase === "running" && previous !== null && wasRecentlyTicking) {
      const milestone = [300, 60, 30].find((value) => previous > value && remaining <= value);
      if (milestone) void AccessibilityInfo.announceForAccessibility(`${milestone >= 60 ? `${milestone / 60} ${milestone === 60 ? "minute" : "minutes"}` : `${milestone} seconds`} remaining.`);
    }
    previousRemainingRef.current = remaining;
    lastTickAtRef.current = currentNow;
    if (isTimerFinished(active, currentNow)) await finish(active, currentNow);
  }, [finish]);

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      setRestoring(true);
      if (!userId) {
        await empty();
        await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY);
        if (alive) { timerRef.current = null; setTimer(null); setFinishedTimer(null); setPendingCount(0); setPendingSessions([]); setRestoring(false); }
        return;
      }
      const raw = await AsyncStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
      let restored: ActiveTimer | null = null;
      try { restored = validateStoredTimer(raw ? JSON.parse(raw) : null); } catch { /* storage is discarded below */ }
      if (!restored || restored.ownerUid !== userId) { await empty(); restored = null; }
      if (!alive) return;
      timerRef.current = restored;
      setTimer(restored);
      setFinishedTimer(null);
      const restoredPending = await readPending();
      setPendingCount(restoredPending.length);
      setPendingSessions(restoredPending);
      previousRemainingRef.current = restored ? remainingSeconds(restored, Date.now()) : null;
      lastTickAtRef.current = Date.now();
      setRestoring(false);
      if (restored && isTimerFinished(restored, Date.now())) await finish(restored);
      await retryPending();
    };
    void restore().catch((cause) => { if (alive) { setSyncError(cause instanceof Error ? cause.message : "Could not restore the timer."); setRestoring(false); } });
    return () => { alive = false; };
  }, [finish, readPending, retryPending, userId]);

  useEffect(() => {
    const interval = setInterval(() => void checkTimer(), 1000);
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") { void checkTimer(); void retryPending(); }
      else if (timerRef.current) void AsyncStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(timerRef.current));
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [checkTimer, retryPending]);

  const start = useCallback(async ({ kind, taskId, taskTitleSnapshot, intention }: StartOptions) => {
    if (!userId) return;
    const now = Date.now();
    const durationSeconds = durationFor(kind);
    finishingIdRef.current = null;
    previousRemainingRef.current = durationSeconds;
    lastTickAtRef.current = now;
    setFinishedTimer(null);
    await setActiveTimer({ version: 1, ownerUid: userId, intervalId: newIntervalId(), kind, taskId, taskTitleSnapshot, intention: intention.trim(), durationSeconds, startedAtMs: now, deadlineAtMs: now + durationSeconds * 1000, remainingWhenPausedSeconds: null, phase: "running" });
    setNowMs(now);
  }, [setActiveTimer, userId]);

  const pause = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const now = Date.now();
    if (isTimerFinished(active, now)) { await finish(active, now); return; }
    const next = pauseTimer(active, now);
    previousRemainingRef.current = remainingSeconds(next, now);
    lastTickAtRef.current = now;
    await setActiveTimer(next);
    setNowMs(now);
  }, [finish, setActiveTimer]);
  const resume = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const now = Date.now();
    const next = resumeTimer(active, now);
    previousRemainingRef.current = remainingSeconds(next, now);
    lastTickAtRef.current = now;
    await setActiveTimer(next);
    setNowMs(now);
  }, [setActiveTimer]);
  const end = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const endedAtMs = Date.now();
    if (isTimerFinished(active, endedAtMs)) { await finish(active, endedAtMs); return; }
    const session = interruptedSession(active, endedAtMs);
    if (session) {
      try { await enqueueSession(session); }
      catch (cause) { setSyncError(cause instanceof Error ? cause.message : "Could not save the interrupted timer yet."); return; }
    }
    await setActiveTimer(null);
    finishingIdRef.current = null;
    setFinishedTimer(null);
  }, [enqueueSession, finish, setActiveTimer]);
  const unlinkTask = useCallback(async (taskId: string) => {
    const active = timerRef.current;
    if (!active || active.taskId !== taskId) return;
    await setActiveTimer({ ...active, taskId: null });
  }, [setActiveTimer]);
  const dismissFinished = useCallback(() => { setFinishedTimer(null); finishingIdRef.current = null; }, []);

  return { timer, remainingSeconds: timer ? remainingSeconds(timer, nowMs) : null, finishedTimer, pendingCount, pendingSessions, syncError, restoring, start, pause, resume, end, unlinkTask, dismissFinished, retryPending };
}
