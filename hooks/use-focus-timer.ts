import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";
import { FOCUS_PENDING_STORAGE_KEY, FOCUS_TIMER_STORAGE_KEY, completedSession, durationFor, interruptedSession, isTimerFinished, pauseTimer, remainingSeconds, resumeTimer, type ActiveTimer, type FocusSessionDraft, type IntervalKind, validateFocusSessionDraft, validateStoredTimer } from "@/lib/focus-domain";
import { focusPendingStorageKey, focusTimerStorageKey, ownedLegacyRecord } from "@/lib/focus-storage";
import { INITIAL_RETRY_DELAY_MS, nextRetryDelay } from "@/lib/retry-backoff";
import { focusSessionSaveMessage, isRetryableFocusSessionError, saveFocusSession } from "@/lib/focus-sessions";
import { cancelFocusCompletionNotification, scheduleFocusCompletionNotification } from "@/lib/focus-notifications";
import { createSerialQueue } from "@/lib/serial-queue";

type PendingEnvelope = { ownerUid: string; sessions: FocusSessionDraft[] };
type StartOptions = { kind: IntervalKind; taskId: string | null; taskTitleSnapshot: string | null; intention: string; durationSeconds?: number };

const newIntervalId = () => `focus-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const TIMER_STORAGE_ERROR = "Could not save the timer on this device. Try again.";
const PENDING_STORAGE_ERROR = "Could not save pending focus data on this device. Try again.";
const NOTIFICATION_ERROR = "Could not update the completion notification. The timer will still work.";
const NOTIFICATION_DENIED = "Notifications are off. The timer will still work, but no lock-screen alert will arrive.";

export function useFocusTimer(userId?: string) {
  const currentUserIdRef = useRef(userId);
  currentUserIdRef.current = userId;
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [finishedTimer, setFinishedTimer] = useState<ActiveTimer | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSessions, setPendingSessions] = useState<FocusSessionDraft[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const timerRef = useRef<ActiveTimer | null>(null);
  const finishingIdRef = useRef<string | null>(null);
  const previousRemainingRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const blockedPendingIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef(createSerialQueue());
  const nextRetryAtRef = useRef(0);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);

  const setActiveTimer = useCallback(async (next: ActiveTimer | null) => {
    if (!userId || currentUserIdRef.current !== userId) return;
    const key = focusTimerStorageKey(userId);
    try {
      if (next) await AsyncStorage.setItem(key, JSON.stringify(next));
      else await AsyncStorage.removeItem(key);
    } catch {
      if (currentUserIdRef.current === userId) setSyncError(TIMER_STORAGE_ERROR);
      throw new Error(TIMER_STORAGE_ERROR);
    }
    if (currentUserIdRef.current === userId) {
      timerRef.current = next;
      setTimer(next);
    }
  }, [userId]);

  const scheduleNotification = useCallback(async (active: ActiveTimer) => {
    let notificationId: string | null = null;
    try {
      notificationId = await scheduleFocusCompletionNotification(active);
      if (!notificationId) {
        if (currentUserIdRef.current === userId) setNotificationNotice(NOTIFICATION_DENIED);
        return active;
      }
      if (currentUserIdRef.current !== userId) {
        await cancelFocusCompletionNotification(notificationId);
        return active;
      }
      const next = { ...active, completionNotificationId: notificationId };
      await setActiveTimer(next);
      if (currentUserIdRef.current === userId) setNotificationNotice(null);
      return next;
    } catch {
      if (notificationId) await cancelFocusCompletionNotification(notificationId).catch(() => undefined);
      if (currentUserIdRef.current === userId) setNotificationNotice(NOTIFICATION_ERROR);
      return active;
    }
  }, [setActiveTimer, userId]);

  const cancelNotification = useCallback(async (active: ActiveTimer) => {
    try {
      await cancelFocusCompletionNotification(active.completionNotificationId);
    } catch {
      if (currentUserIdRef.current === userId) setNotificationNotice(NOTIFICATION_ERROR);
      throw new Error(NOTIFICATION_ERROR);
    }
  }, [userId]);

  const readPending = useCallback(async (): Promise<FocusSessionDraft[]> => {
    if (!userId) return [];
    const raw = await AsyncStorage.getItem(focusPendingStorageKey(userId));
    if (!raw) return [];
    try {
      const envelope = JSON.parse(raw) as PendingEnvelope;
      if (envelope.ownerUid !== userId || !Array.isArray(envelope.sessions)) {
        await AsyncStorage.removeItem(focusPendingStorageKey(userId));
        return [];
      }
      const valid = envelope.sessions.map(validateFocusSessionDraft).filter((session): session is FocusSessionDraft => session !== null);
      if (valid.length !== envelope.sessions.length) {
        if (currentUserIdRef.current === userId) setSyncError("One invalid pending focus record was discarded locally.");
        if (valid.length) await AsyncStorage.setItem(focusPendingStorageKey(userId), JSON.stringify({ ownerUid: userId, sessions: valid }));
        else await AsyncStorage.removeItem(focusPendingStorageKey(userId));
      }
      return valid;
    } catch { await AsyncStorage.removeItem(focusPendingStorageKey(userId)); return []; }
  }, [userId]);

  const writePending = useCallback(async (sessions: FocusSessionDraft[]) => {
    if (!userId) return;
    try {
      if (sessions.length) await AsyncStorage.setItem(focusPendingStorageKey(userId), JSON.stringify({ ownerUid: userId, sessions }));
      else await AsyncStorage.removeItem(focusPendingStorageKey(userId));
    } catch {
      if (currentUserIdRef.current === userId) setSyncError(PENDING_STORAGE_ERROR);
      throw new Error(PENDING_STORAGE_ERROR);
    }
    if (currentUserIdRef.current === userId) {
      setPendingCount(sessions.length);
      setPendingSessions(sessions);
    }
  }, [userId]);

  const migrateLegacyStorage = useCallback(async () => {
    if (!userId) return;
    const timerKey = focusTimerStorageKey(userId);
    const pendingKey = focusPendingStorageKey(userId);
    const [timerRaw, legacyTimerRaw, pendingRaw, legacyPendingRaw] = await Promise.all([
      AsyncStorage.getItem(timerKey), AsyncStorage.getItem(FOCUS_TIMER_STORAGE_KEY),
      AsyncStorage.getItem(pendingKey), AsyncStorage.getItem(FOCUS_PENDING_STORAGE_KEY),
    ]);
    if (timerRaw === null) {
      const legacy = ownedLegacyRecord(legacyTimerRaw, userId);
      if (legacy) {
        try {
          const restored = validateStoredTimer(JSON.parse(legacy));
          if (restored?.ownerUid === userId) {
            await AsyncStorage.setItem(timerKey, legacy);
            await AsyncStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
          }
        } catch { /* Keep malformed legacy data untouched for recovery/debugging. */ }
      }
    }
    if (pendingRaw === null) {
      const legacy = ownedLegacyRecord(legacyPendingRaw, userId);
      if (legacy) {
        await AsyncStorage.setItem(pendingKey, legacy);
        await AsyncStorage.removeItem(FOCUS_PENDING_STORAGE_KEY);
      }
    }
  }, [userId]);

  const retryPendingNow = useCallback(async () => {
    if (!userId) return;
    const pending = await readPending();
    if (!pending.length) { if (currentUserIdRef.current === userId) setPendingCount(0); return; }
    const remaining: FocusSessionDraft[] = [];
    let hasRetryableFailure = false;
    for (const session of pending) {
      if (blockedPendingIdsRef.current.has(session.id)) { remaining.push(session); continue; }
      try { await saveFocusSession(userId, session); }
      catch (cause) {
        remaining.push(session);
        if (isRetryableFocusSessionError(cause)) hasRetryableFailure = true;
        else blockedPendingIdsRef.current.add(session.id);
        if (currentUserIdRef.current === userId) setSyncError(isRetryableFocusSessionError(cause) ? "Waiting to sync your focus session." : focusSessionSaveMessage(cause));
      }
    }
    await writePending(remaining);
    if (!remaining.length && currentUserIdRef.current === userId) setSyncError(null);
    return hasRetryableFailure;
  }, [readPending, userId, writePending]);

  const runRetry = useCallback(async () => {
    const hasRetryableFailure = await retryPendingNow();
    if (currentUserIdRef.current !== userId) return;
    if (hasRetryableFailure) {
      nextRetryAtRef.current = Date.now() + retryDelayRef.current;
      retryDelayRef.current = nextRetryDelay(retryDelayRef.current);
    } else {
      nextRetryAtRef.current = 0;
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
    }
  }, [retryPendingNow, userId]);

  const enqueueSession = useCallback(async (session: FocusSessionDraft) => {
    await queueRef.current(async () => {
      const pending = await readPending();
      if (!pending.some((item) => item.id === session.id)) await writePending([...pending, session]);
      await runRetry();
    });
  }, [readPending, runRetry, writePending]);

  const retryPending = useCallback(async () => {
    if (Date.now() < nextRetryAtRef.current) return;
    await queueRef.current(async () => {
      if (Date.now() < nextRetryAtRef.current) return;
      await runRetry();
    });
  }, [runRetry]);

  const finish = useCallback(async (active: ActiveTimer, currentNow = Date.now()) => {
    if (finishingIdRef.current === active.intervalId) return;
    finishingIdRef.current = active.intervalId;
    try {
      await enqueueSession(completedSession(active, currentNow));
      await setActiveTimer(null);
      if (currentUserIdRef.current !== active.ownerUid) return;
      setFinishedTimer(active);
      setNowMs(currentNow);
      if (AppState.currentState === "active") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      void AccessibilityInfo.announceForAccessibility("Timer complete. Choose your next step.");
    } catch (cause) {
      finishingIdRef.current = null;
      if (currentUserIdRef.current === active.ownerUid) setSyncError(cause instanceof Error ? cause.message : "Could not save the completed timer yet.");
    }
  }, [enqueueSession, setActiveTimer]);

  const checkTimer = useCallback(async (currentNow = Date.now()) => {
    const active = timerRef.current;
    if (!active || active.ownerUid !== currentUserIdRef.current) return;
    setNowMs(currentNow);
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
      blockedPendingIdsRef.current.clear();
      nextRetryAtRef.current = 0;
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
      if (!userId) {
        if (alive) { timerRef.current = null; setTimer(null); setFinishedTimer(null); setPendingCount(0); setPendingSessions([]); setNotificationNotice(null); setRestoring(false); }
        return;
      }
      await migrateLegacyStorage();
      const raw = await AsyncStorage.getItem(focusTimerStorageKey(userId));
      let restored: ActiveTimer | null = null;
      try { restored = validateStoredTimer(raw ? JSON.parse(raw) : null); } catch { /* storage is discarded below */ }
      if (!restored || restored.ownerUid !== userId) { await AsyncStorage.removeItem(focusTimerStorageKey(userId)); restored = null; }
      if (!alive) return;
      timerRef.current = restored;
      setTimer(restored);
      setFinishedTimer(null);
      if (restored?.phase === "running" && restored.deadlineAtMs !== null && restored.deadlineAtMs > Date.now() && !restored.completionNotificationId) restored = await scheduleNotification(restored);
      const restoredPending = await readPending();
      if (!alive || currentUserIdRef.current !== userId) return;
      setPendingCount(restoredPending.length);
      setPendingSessions(restoredPending);
      previousRemainingRef.current = restored ? remainingSeconds(restored, Date.now()) : null;
      lastTickAtRef.current = Date.now();
      setRestoring(false);
      if (restored && isTimerFinished(restored, Date.now())) await finish(restored);
      if (alive && currentUserIdRef.current === userId) await retryPending();
    };
    void restore().catch((cause) => { if (alive && currentUserIdRef.current === userId) { setSyncError(cause instanceof Error ? cause.message : "Could not restore the timer."); setRestoring(false); } });
    return () => { alive = false; };
  }, [finish, migrateLegacyStorage, readPending, retryPending, scheduleNotification, userId]);

  useEffect(() => {
    const interval = setInterval(() => void checkTimer(), 1000);
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") { void checkTimer(); void retryPending(); }
      else if (timerRef.current && userId) void AsyncStorage.setItem(focusTimerStorageKey(userId), JSON.stringify(timerRef.current));
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [checkTimer, retryPending, userId]);

  const start = useCallback(async ({ kind, taskId, taskTitleSnapshot, intention, durationSeconds: requestedDuration }: StartOptions) => {
    if (!userId) return;
    const now = Date.now();
    const durationSeconds = typeof requestedDuration === "number" && Number.isInteger(requestedDuration) && requestedDuration >= 60 && requestedDuration <= 14_400 ? requestedDuration : durationFor(kind);
    finishingIdRef.current = null;
    previousRemainingRef.current = durationSeconds;
    lastTickAtRef.current = now;
    setFinishedTimer(null);
    const active: ActiveTimer = { version: 1, ownerUid: userId, intervalId: newIntervalId(), kind, taskId, taskTitleSnapshot, intention: intention.trim(), durationSeconds, startedAtMs: now, deadlineAtMs: now + durationSeconds * 1000, remainingWhenPausedSeconds: null, phase: "running", alertSound: null, completionNotificationId: null };
    await setActiveTimer(active);
    await scheduleNotification(active);
    setNowMs(now);
  }, [scheduleNotification, setActiveTimer, userId]);

  const pause = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const now = Date.now();
    if (isTimerFinished(active, now)) { await finish(active, now); return; }
    const next = pauseTimer(active, now);
    previousRemainingRef.current = remainingSeconds(next, now);
    lastTickAtRef.current = now;
    try { await cancelNotification(active); await setActiveTimer(next); } catch { return; }
    setNowMs(now);
  }, [cancelNotification, finish, setActiveTimer]);
  const resume = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const now = Date.now();
    const next = resumeTimer(active, now);
    previousRemainingRef.current = remainingSeconds(next, now);
    lastTickAtRef.current = now;
    try { await setActiveTimer(next); } catch { return; }
    await scheduleNotification(next);
    setNowMs(now);
  }, [scheduleNotification, setActiveTimer]);
  const end = useCallback(async () => {
    const active = timerRef.current;
    if (!active) return;
    const endedAtMs = Date.now();
    if (isTimerFinished(active, endedAtMs)) { await finish(active, endedAtMs); return; }
    try { await cancelNotification(active); } catch { return; }
    const session = interruptedSession(active, endedAtMs);
    if (session) {
      try { await enqueueSession(session); }
      catch (cause) { if (currentUserIdRef.current === active.ownerUid) setSyncError(cause instanceof Error ? cause.message : "Could not save the interrupted timer yet."); return; }
    }
    try { await setActiveTimer(null); } catch { return; }
    finishingIdRef.current = null;
    setFinishedTimer(null);
  }, [cancelNotification, enqueueSession, finish, setActiveTimer]);
  const unlinkTask = useCallback(async (taskId: string) => {
    const active = timerRef.current;
    if (!active || active.taskId !== taskId) return;
    try { await setActiveTimer({ ...active, taskId: null }); } catch { /* setActiveTimer surfaces the storage error. */ }
  }, [setActiveTimer]);
  const dismissFinished = useCallback(() => { setFinishedTimer(null); finishingIdRef.current = null; }, []);

  return { timer, remainingSeconds: timer ? remainingSeconds(timer, nowMs) : null, finishedTimer, pendingCount, pendingSessions, syncError, notificationNotice, restoring, start, pause, resume, end, unlinkTask, dismissFinished, retryPending };
}
