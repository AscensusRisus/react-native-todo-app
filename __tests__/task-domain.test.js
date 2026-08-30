import {
  isDateKey,
  longestStreak,
  shouldShowToday,
  streakFor,
  taskDateState,
  validateTaskDraft,
} from "../lib/task-domain";

const draft = {
  title: "Plan the presentation",
  notes: "",
  category: "Work",
  schedule: "daily",
  priority: "medium",
  dueDate: null,
};

describe("task domain rules", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-08-28T12:00:00")));
  afterEach(() => jest.useRealTimers());

  it("accepts real calendar dates and rejects impossible ones", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("28-02-2026")).toBe(false);
  });

  it("requires a valid date for one-time tasks", () => {
    expect(validateTaskDraft({ ...draft, schedule: "once", dueDate: null })).toMatch(/due date/i);
    expect(validateTaskDraft({ ...draft, schedule: "once", dueDate: "2026-09-01" })).toBeNull();
  });

  it("shows a one-time task only when due or completed today", () => {
    expect(shouldShowToday({ schedule: "once", dueDate: "2026-08-29", completions: [] })).toBe(false);
    expect(shouldShowToday({ schedule: "once", dueDate: "2026-08-27", completions: [] })).toBe(true);
    expect(shouldShowToday({ schedule: "once", dueDate: "2026-08-29", completions: ["2026-08-28"] })).toBe(true);
  });

  it("labels overdue, today, and upcoming one-time tasks", () => {
    expect(taskDateState({ schedule: "once", dueDate: "2026-08-27", completions: [] })).toBe("overdue");
    expect(taskDateState({ schedule: "once", dueDate: "2026-08-28", completions: [] })).toBe("today");
    expect(taskDateState({ schedule: "once", dueDate: "2026-08-29", completions: [] })).toBe("upcoming");
  });

  it("calculates active and personal-best streaks with duplicate check-ins", () => {
    const completions = ["2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-28"];
    expect(streakFor(completions)).toBe(4);
    expect(longestStreak(completions)).toBe(4);
  });
});
