import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";
import { FOCUS_PENDING_STORAGE_KEY, FOCUS_TIMER_STORAGE_KEY, completedSession, interruptedSession, isTimerFinished, pauseTimer, remainingSeconds, resumeTimer, type ActiveTimer, type FocusSessionDraft, type IntervalKind, validateStoredTimer } from "@/lib/focus-domain";
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const timerRef = useRef<ActiveTimer | null>(null);
  const finishingIdRef = useRef<string | null>(null);

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
    await retryPending();
  }, [readPending, retryPending, writePending]);

  const finish = useCallback(async (active: ActiveTimer, currentNow = Date.now()) => {
    if (finishingIdRef.current === active.intervalId) return;
    finishingIdRef.current = active.intervalId;
    await setActiveTimer(null);
    setFinishedTimer(active);
    setNowMs(currentNow);
    await enqueueSession(completedSession(active, currentNow));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void AccessibilityInfo.announceForAccessibility("Timer complete. Choose your next step.");
  }, [enqueueSession, setActiveTimer]);

  const checkTimer = useCallback(async (currentNow = Date.now()) => {
    const active = timerRef.current;
    setNowMs(currentNow);
    if (active && isTimerFinished(active, currentNow)) await finish(active, currentNow);
  }, [finish]);

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      setRestoring(true);
      if (!userId) {
        await empty();
        await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY);
        if (alive) { timerRef.current = null; setTimer(null); setFinishedTimer(null); setPendingCount(0); setRestoring(false); }
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
      setPendingCount((await readPending()).length);
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
    const durationSeconds = kind === "focus" ? 1500 : kind === "shortBreak" ? 300 : 900;
    finishingIdRef.current = null;
    setFinishedTimer(null);
    await setActiveTimer({ version: 1, ownerUid: userId, intervalId: newIntervalId(), kind, taskId, taskTitleSnapshot, intention: intention.trim(), durationSeconds, startedAtMs: now, deadlineAtMs: now + durationSeconds * 1000, remainingWhenPausedSeconds: null, phase: "running" });
    setNowMs(now);
  }, [setActiveTimer, userId]);

  const pause = useCallback(async () => { if (timerRef.current) { const next = pauseTimer(timerRef.current, Date.now()); await setActiveTimer(next); setNowMs(Date.now()); } }, [setActiveTimer]);
  const resume = useCallback(async () => { if (timerRef.current) { const next = resumeTimer(timerRef.current, Date.now()); await setActiveTimer(next); setNowMs(Date.now()); } }, [setActiveTimer]);
  const end = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const endedAtMs = Date.now();
    const session = interruptedSession(active, endedAtMs);
    await setActiveTimer(null);
    finishingIdRef.current = null;
    setFinishedTimer(null);
    if (session) await enqueueSession(session);
  }, [enqueueSession, setActiveTimer]);
  const unlinkTask = useCallback(async (taskId: string) => {
    const active = timerRef.current;
    if (!active || active.taskId !== taskId) return;
    await setActiveTimer({ ...active, taskId: null });
  }, [setActiveTimer]);
  const dismissFinished = useCallback(() => { setFinishedTimer(null); finishingIdRef.current = null; }, []);

  return { timer, remainingSeconds: timer ? remainingSeconds(timer, nowMs) : null, finishedTimer, pendingCount, syncError, restoring, start, pause, resume, end, unlinkTask, dismissFinished, retryPending };
}
