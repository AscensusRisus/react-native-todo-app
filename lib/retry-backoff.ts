export const INITIAL_RETRY_DELAY_MS = 1_000;
export const MAX_RETRY_DELAY_MS = 60_000;

export function nextRetryDelay(currentDelayMs: number) {
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(INITIAL_RETRY_DELAY_MS, currentDelayMs * 2));
}
