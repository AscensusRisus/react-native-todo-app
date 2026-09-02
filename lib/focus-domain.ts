import { dateKey } from "./task-domain";
import type { AlertSound } from "./focus-preferences";

export type IntervalKind = "focus" | "shortBreak" | "longBreak";
export type TimerPhase = "idle" | "running" | "paused" | "finished";

export type ActiveTimer = {
  version: 1;
  ownerUid: string;
  intervalId: string;
  kind: IntervalKind;
  taskId: string | null;
  taskTitleSnapshot: string | null;
  intention: string;
  alertSound: AlertSound | null;
  durationSeconds: number;
  startedAtMs: number;
  deadlineAtMs: number | null;
  remainingWhenPausedSeconds: number | null;
  phase: Exclude<TimerPhase, "finished">;
};

export type FocusSessionDraft = {
  id: string;
  taskId: string | null;
  taskTitleSnapshot: string | null;
  intention: string;
  kind: IntervalKind;
  status: "completed" | "interrupted";
  plannedSeconds: number;
  focusedSeconds: number;
  localDate: string;
  startedAtMs: number;
  endedAtMs: number;
};

export const INTERVAL_SECONDS: Record<IntervalKind, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const FOCUS_TIMER_STORAGE_KEY = "focusTimer:v1";
export const FOCUS_PENDING_STORAGE_KEY = "focusTimer:pendingSessions:v1";
export const durationFor = (kind: IntervalKind) => INTERVAL_SECONDS[kind];

export function remainingSeconds(timer: ActiveTimer, nowMs: number) {
  if (timer.phase === "paused") return timer.remainingWhenPausedSeconds ?? timer.durationSeconds;
  if (!timer.deadlineAtMs) return timer.durationSeconds;
  return Math.max(0, Math.ceil((timer.deadlineAtMs - nowMs) / 1000));
}

export function pauseTimer(timer: ActiveTimer, nowMs: number): ActiveTimer {
  if (timer.phase !== "running") return timer;
  return { ...timer, phase: "paused", deadlineAtMs: null, remainingWhenPausedSeconds: remainingSeconds(timer, nowMs) };
}

export function resumeTimer(timer: ActiveTimer, nowMs: number): ActiveTimer {
  if (timer.phase !== "paused") return timer;
  const remaining = timer.remainingWhenPausedSeconds ?? timer.durationSeconds;
  return { ...timer, phase: "running", deadlineAtMs: nowMs + remaining * 1000, remainingWhenPausedSeconds: null };
}

export function isTimerFinished(timer: ActiveTimer, nowMs: number) {
  return timer.phase === "running" && remainingSeconds(timer, nowMs) === 0;
}

export function focusedSecondsForInterruptedTimer(timer: ActiveTimer, nowMs: number) {
  if (timer.kind !== "focus") return 0;
  const remaining = remainingSeconds(timer, nowMs);
  return Math.max(0, Math.min(timer.durationSeconds, timer.durationSeconds - remaining));
}

export function completedSession(timer: ActiveTimer, endedAtMs: number): FocusSessionDraft {
  return {
    id: timer.intervalId, taskId: timer.taskId, taskTitleSnapshot: timer.taskTitleSnapshot,
    intention: timer.intention, kind: timer.kind, status: "completed", plannedSeconds: timer.durationSeconds,
    focusedSeconds: timer.kind === "focus" ? timer.durationSeconds : 0,
    localDate: dateKey(new Date(endedAtMs)), startedAtMs: timer.startedAtMs, endedAtMs,
  };
}

export function interruptedSession(timer: ActiveTimer, endedAtMs: number): FocusSessionDraft | null {
  const focusedSeconds = focusedSecondsForInterruptedTimer(timer, endedAtMs);
  if (timer.kind !== "focus" || focusedSeconds < 60) return null;
  return {
    id: timer.intervalId, taskId: timer.taskId, taskTitleSnapshot: timer.taskTitleSnapshot,
    intention: timer.intention, kind: timer.kind, status: "interrupted", plannedSeconds: timer.durationSeconds,
    focusedSeconds, localDate: dateKey(new Date(endedAtMs)), startedAtMs: timer.startedAtMs, endedAtMs,
  };
}

export function focusSessionPayload(session: FocusSessionDraft) {
  return {
    taskId: session.taskId, taskTitleSnapshot: session.taskTitleSnapshot, intention: session.intention,
    kind: session.kind, status: session.status, plannedSeconds: session.plannedSeconds, focusedSeconds: session.focusedSeconds,
    localDate: session.localDate, startedAtMs: session.startedAtMs, endedAtMs: session.endedAtMs,
  };
}

const isKind = (value: unknown): value is IntervalKind => value === "focus" || value === "shortBreak" || value === "longBreak";

export function validateStoredTimer(value: unknown): ActiveTimer | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || typeof item.ownerUid !== "string" || !item.ownerUid || typeof item.intervalId !== "string" || !item.intervalId || !isKind(item.kind)) return null;
  if (item.phase !== "running" && item.phase !== "paused") return null;
  if (typeof item.durationSeconds !== "number" || !Number.isInteger(item.durationSeconds) || item.durationSeconds < 1 || item.durationSeconds > 14_400) return null;
  if (typeof item.startedAtMs !== "number" || !Number.isFinite(item.startedAtMs)) return null;
  if (!(item.taskId === null || typeof item.taskId === "string") || !(item.taskTitleSnapshot === null || typeof item.taskTitleSnapshot === "string") || typeof item.intention !== "string" || item.intention.length > 120) return null;
  const alertSound = item.alertSound;
  if (!(alertSound === undefined || alertSound === null || (typeof alertSound === "object" && alertSound !== null && typeof (alertSound as Record<string, unknown>).uri === "string" && typeof (alertSound as Record<string, unknown>).name === "string" && (((alertSound as Record<string, unknown>).mimeType === null) || typeof (alertSound as Record<string, unknown>).mimeType === "string")))) return null;
  if (item.phase === "running" && (typeof item.deadlineAtMs !== "number" || !Number.isFinite(item.deadlineAtMs) || item.remainingWhenPausedSeconds !== null)) return null;
  if (item.phase === "paused" && (item.deadlineAtMs !== null || typeof item.remainingWhenPausedSeconds !== "number" || !Number.isInteger(item.remainingWhenPausedSeconds) || item.remainingWhenPausedSeconds < 0 || item.remainingWhenPausedSeconds > item.durationSeconds)) return null;
  return { ...item, alertSound: alertSound ?? null } as ActiveTimer;
}

export function todayFocusSummary(sessions: FocusSessionDraft[], localDate: string) {
  const focus = sessions.filter((session) => session.localDate === localDate && session.status === "completed" && session.kind === "focus");
  return { rounds: focus.length, focusedMinutes: Math.floor(focus.reduce((total, session) => total + session.focusedSeconds, 0) / 60) };
}
