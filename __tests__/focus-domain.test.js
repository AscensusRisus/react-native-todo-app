import { completedSession, durationFor, focusSessionPayload, focusedSecondsForInterruptedTimer, interruptedSession, isTimerFinished, pauseTimer, remainingSeconds, resumeTimer, todayFocusSummary, validateFocusSessionDraft, validateStoredTimer } from "../lib/focus-domain";

const running = (overrides = {}) => ({ version: 1, ownerUid: "user-1", intervalId: "interval-1", kind: "focus", taskId: "task-1", taskTitleSnapshot: "Draft", intention: "Opening", alertSound: null, durationSeconds: 1500, startedAtMs: 1_000, deadlineAtMs: 1_501_000, remainingWhenPausedSeconds: null, phase: "running", ...overrides });

describe("focus timer domain", () => {
  it("uses the expected presets and timestamp-based countdown", () => {
    expect(durationFor("focus")).toBe(1500);
    expect(durationFor("shortBreak")).toBe(300);
    expect(durationFor("longBreak")).toBe(900);
    expect(remainingSeconds(running(), 2_400)).toBe(1499);
    expect(remainingSeconds(running(), 1_501_001)).toBe(0);
  });

  it("pauses and resumes without losing elapsed time", () => {
    const paused = pauseTimer(running(), 301_100);
    expect(paused.phase).toBe("paused");
    expect(paused.remainingWhenPausedSeconds).toBe(1200);
    expect(remainingSeconds(paused, 9_999_999)).toBe(1200);
    expect(resumeTimer(paused, 10_000).deadlineAtMs).toBe(1_210_000);
  });

  it("detects zero crossing idempotently from the active timer", () => {
    expect(isTimerFinished(running(), 1_501_000)).toBe(true);
    expect(isTimerFinished(running({ phase: "paused", deadlineAtMs: null, remainingWhenPausedSeconds: 0 }), 1_501_000)).toBe(false);
  });

  it("validates persisted state and rejects malformed or future records", () => {
    expect(validateStoredTimer(running())).toMatchObject({ ownerUid: "user-1" });
    expect(validateStoredTimer({ ...running(), version: 2 })).toBeNull();
    expect(validateStoredTimer({ ...running(), ownerUid: "" })).toBeNull();
    expect(validateStoredTimer({ ...running(), intention: "x".repeat(121) })).toBeNull();
    expect(validateStoredTimer({ ...running(), alertSound: { uri: 4, name: "bad", mimeType: null } })).toBeNull();
    const { alertSound, ...legacyTimer } = running();
    expect(validateStoredTimer(legacyTimer)).toMatchObject({ alertSound: null });
  });

  it("only preserves interrupted focus after one minute", () => {
    expect(focusedSecondsForInterruptedTimer(running(), 60_500)).toBe(59);
    expect(focusedSecondsForInterruptedTimer(running(), 61_000)).toBe(60);
    expect(interruptedSession(running(), 60_500)).toBeNull();
    expect(interruptedSession(running(), 61_000)).toMatchObject({ status: "interrupted", focusedSeconds: 60 });
    expect(completedSession(running(), 1_501_000).focusedSeconds).toBe(1500);
  });

  it("summarizes only completed focus sessions from today", () => {
    const sessions = [
      completedSession(running(), new Date("2026-09-02T12:00:00").getTime()),
      { ...completedSession(running({ intervalId: "break", kind: "shortBreak" }), new Date("2026-09-02T13:00:00").getTime()), kind: "shortBreak" },
      { ...completedSession(running({ intervalId: "old" }), new Date("2026-09-01T13:00:00").getTime()), localDate: "2026-09-01" },
    ];
    expect(todayFocusSummary(sessions, "2026-09-02")).toEqual({ rounds: 1, focusedMinutes: 25 });
  });

  it("serializes session snapshots without changing their values", () => {
    const session = completedSession(running({ taskTitleSnapshot: "Keep this title", intention: "Write clearly" }), 1_501_000);
    const payload = focusSessionPayload(session);
    expect(Object.keys(payload)).toEqual(["taskId", "taskTitleSnapshot", "intention", "kind", "status", "plannedSeconds", "focusedSeconds", "localDate", "startedAtMs", "endedAtMs"]);
    expect(payload).toMatchObject({ taskId: "task-1", taskTitleSnapshot: "Keep this title", intention: "Write clearly", plannedSeconds: 1500, focusedSeconds: 1500, startedAtMs: 1_000, endedAtMs: 1_501_000 });
  });

  it("accepts only complete, bounded pending session records", () => {
    const valid = { id: "focus-1", taskId: "task-1", taskTitleSnapshot: "Read", intention: "", kind: "focus", status: "completed", plannedSeconds: 1500, focusedSeconds: 1500, localDate: "2026-09-03", startedAtMs: 1000, endedAtMs: 1501000 };
    expect(validateFocusSessionDraft(valid)).toEqual(valid);
    expect(validateFocusSessionDraft({ ...valid, localDate: "not-a-date" })).toBeNull();
    expect(validateFocusSessionDraft({ ...valid, focusedSeconds: 1501 })).toBeNull();
    expect(validateFocusSessionDraft({ ...valid, kind: "shortBreak", focusedSeconds: 1 })).toBeNull();
    expect(validateFocusSessionDraft({ ...valid, status: "interrupted", focusedSeconds: 30 })).toBeNull();
  });
});
