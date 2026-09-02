import { DEFAULT_INTERVAL_DURATIONS, durationBounds, isValidDuration, validateFocusPreferences } from "../lib/focus-preferences";

describe("focus preferences", () => {
  const valid = { version: 1, ownerUid: "user-1", durations: DEFAULT_INTERVAL_DURATIONS, alertSound: null };

  it("keeps editable duration ranges conservative", () => {
    expect(durationBounds("focus")).toEqual({ min: 300, max: 10800 });
    expect(isValidDuration("shortBreak", 60)).toBe(true);
    expect(isValidDuration("longBreak", 60)).toBe(false);
    expect(isValidDuration("focus", 10_801)).toBe(false);
  });

  it("restores settings only for the owning account and valid local sound metadata", () => {
    expect(validateFocusPreferences(valid, "user-1")).toEqual(valid);
    expect(validateFocusPreferences(valid, "another-user")).toBeNull();
    expect(validateFocusPreferences({ ...valid, durations: { ...valid.durations, focus: 90 } }, "user-1")).toBeNull();
    expect(validateFocusPreferences({ ...valid, alertSound: { uri: "file:///alert.mp3", name: "alert.mp3", mimeType: "audio/mpeg" } }, "user-1")).toMatchObject({ alertSound: { name: "alert.mp3" } });
  });
});
