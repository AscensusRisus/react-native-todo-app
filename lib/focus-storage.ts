import { FOCUS_PENDING_STORAGE_KEY, FOCUS_TIMER_STORAGE_KEY } from "./focus-domain";

export const focusTimerStorageKey = (userId: string) => `${FOCUS_TIMER_STORAGE_KEY}:user:${encodeURIComponent(userId)}`;
export const focusPendingStorageKey = (userId: string) => `${FOCUS_PENDING_STORAGE_KEY}:user:${encodeURIComponent(userId)}`;

export function ownedLegacyRecord(raw: string | null, userId: string) {
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as { ownerUid?: unknown };
    return record.ownerUid === userId ? raw : null;
  } catch {
    return null;
  }
}
