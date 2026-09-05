import { INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS, nextRetryDelay } from "../lib/retry-backoff";

describe("retry backoff", () => {
  it("doubles transient retry delays from the initial value", () => {
    expect(INITIAL_RETRY_DELAY_MS).toBe(1_000);
    expect(nextRetryDelay(INITIAL_RETRY_DELAY_MS)).toBe(2_000);
    expect(nextRetryDelay(30_000)).toBe(60_000);
  });

  it("never exceeds the bounded maximum", () => {
    expect(MAX_RETRY_DELAY_MS).toBe(60_000);
    expect(nextRetryDelay(MAX_RETRY_DELAY_MS)).toBe(MAX_RETRY_DELAY_MS);
    expect(nextRetryDelay(0)).toBe(INITIAL_RETRY_DELAY_MS);
  });
});
