import { focusPendingStorageKey, focusTimerStorageKey, ownedLegacyRecord } from "../lib/focus-storage";

describe("focus storage ownership", () => {
  it("keeps timer and pending storage separate for each user", () => {
    expect(focusTimerStorageKey("user/a")).not.toBe(focusTimerStorageKey("user/b"));
    expect(focusPendingStorageKey("user/a")).not.toBe(focusPendingStorageKey("user/b"));
    expect(focusTimerStorageKey("user/a")).not.toBe(focusPendingStorageKey("user/a"));
  });

  it("only migrates a legacy record to its recorded owner", () => {
    const raw = JSON.stringify({ ownerUid: "user-a", sessions: [] });
    expect(ownedLegacyRecord(raw, "user-a")).toBe(raw);
    expect(ownedLegacyRecord(raw, "user-b")).toBeNull();
    expect(ownedLegacyRecord("not-json", "user-a")).toBeNull();
  });
});
