import type { IntervalKind } from "./focus-domain";

export type IntervalDurations = Record<IntervalKind, number>;
export type AlertSound = { uri: string; name: string; mimeType: string | null; source?: "system" | "file" };
export type FocusPreferences = {
  version: 1;
  ownerUid: string;
  durations: IntervalDurations;
  alertSound: AlertSound | null;
};

export const DEFAULT_INTERVAL_DURATIONS: IntervalDurations = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
export const FOCUS_PREFERENCES_STORAGE_KEY = "focusTimer:preferences:v1";

export function durationBounds(kind: IntervalKind) {
  if (kind === "focus") return { min: 5 * 60, max: 180 * 60 };
  if (kind === "shortBreak") return { min: 1 * 60, max: 60 * 60 };
  return { min: 5 * 60, max: 120 * 60 };
}

export function isValidDuration(kind: IntervalKind, seconds: unknown): seconds is number {
  const { min, max } = durationBounds(kind);
  return typeof seconds === "number" && Number.isInteger(seconds) && seconds >= min && seconds <= max;
}

export function validateFocusPreferences(value: unknown, ownerUid: string): FocusPreferences | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || item.ownerUid !== ownerUid || !item.durations || typeof item.durations !== "object") return null;
  const durations = item.durations as Record<string, unknown>;
  if (!isValidDuration("focus", durations.focus) || !isValidDuration("shortBreak", durations.shortBreak) || !isValidDuration("longBreak", durations.longBreak)) return null;
  const sound = item.alertSound;
  if (sound !== null && (!sound || typeof sound !== "object" || typeof (sound as Record<string, unknown>).uri !== "string" || typeof (sound as Record<string, unknown>).name !== "string" || !((sound as Record<string, unknown>).mimeType === null || typeof (sound as Record<string, unknown>).mimeType === "string") || !((sound as Record<string, unknown>).source === undefined || (sound as Record<string, unknown>).source === "system" || (sound as Record<string, unknown>).source === "file"))) return null;
  return item as FocusPreferences;
}

export function minutesFor(seconds: number) { return Math.round(seconds / 60); }
