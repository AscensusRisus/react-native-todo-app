export type TaskSchedule = "daily" | "weekdays" | "weekends" | "once";
export type TaskPriority = "low" | "medium" | "high";

export type TaskDraft = {
  title: string;
  notes: string;
  category: string;
  schedule: TaskSchedule;
  priority: TaskPriority;
  dueDate: string | null;
};

export type TaskLike = {
  schedule?: TaskSchedule;
  dueDate?: string | null;
  completions: string[];
};

export const categories = ["Personal", "Work", "Health", "Home"] as const;
export const defaultTaskDraft: TaskDraft = {
  title: "",
  notes: "",
  category: "Personal",
  schedule: "daily",
  priority: "medium",
  dueDate: null,
};

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayKey = () => dateKey();

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && dateKey(date) === value;
}

export function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function validateTaskDraft(draft: TaskDraft) {
  if (!draft.title.trim()) return "Give this task a clear name.";
  if (draft.title.trim().length > 80) return "Keep the task name under 80 characters.";
  if (draft.notes.trim().length > 2000) return "Keep details under 2,000 characters.";
  if (draft.schedule === "once" && (!draft.dueDate || !isDateKey(draft.dueDate))) return "Use a real due date in YYYY-MM-DD format.";
  return null;
}

export function taskDateState(task: TaskLike, date = new Date()) {
  if (task.schedule !== "once" || !task.dueDate) return "routine" as const;
  const target = dateKey(date);
  if (task.dueDate < target) return "overdue" as const;
  if (task.dueDate === target) return "today" as const;
  return "upcoming" as const;
}

export function shouldShowToday(task: TaskLike, date = new Date()) {
  const schedule = task.schedule ?? "daily";
  const day = date.getDay();
  if (schedule === "weekdays") return day >= 1 && day <= 5;
  if (schedule === "weekends") return day === 0 || day === 6;
  if (schedule === "once") {
    if (task.completions.includes(dateKey(date))) return true;
    return !task.dueDate ? !task.completions.length : task.dueDate <= dateKey(date);
  }
  return true;
}

export const scheduleLabel = (schedule?: TaskSchedule) => ({ daily: "Every day", weekdays: "Weekdays", weekends: "Weekends", once: "One time" }[schedule ?? "daily"]);

export function dueDateLabel(dueDate?: string | null) {
  if (!dueDate || !isDateKey(dueDate)) return "No date";
  return new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function streakFor(completions: string[]) {
  const completed = new Set(completions);
  const date = new Date();
  if (!completed.has(dateKey(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (completed.has(dateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

export function longestStreak(completions: string[]) {
  const sorted = [...new Set(completions)].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const date = new Date(`${key}T12:00:00`);
    current = previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = date;
  }
  return longest;
}

export function lastSevenDays(completions: string[]) {
  const completed = new Set(completions);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { key: dateKey(date), label: date.toLocaleDateString(undefined, { weekday: "narrow" }), completed: completed.has(dateKey(date)) };
  });
}
