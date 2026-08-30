import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseSetupError } from "./firebase";
import type { TaskDraft, TaskPriority, TaskSchedule } from "./task-domain";

export type { TaskDraft, TaskPriority, TaskSchedule } from "./task-domain";
export { dateAfter, dateKey, defaultTaskDraft, dueDateLabel, isDateKey, lastSevenDays, longestStreak, scheduleLabel, shouldShowToday, streakFor, taskDateState, todayKey, validateTaskDraft } from "./task-domain";

export type Task = TaskDraft & {
  id: string;
  createdDate?: string;
  completions: string[];
};

/** @deprecated Use Task. Kept temporarily so saved task data remains compatible. */
export type Habit = Task;

const tasksCollection = (userId: string) => {
  if (!db) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  return collection(db, "users", userId, "habits");
};

const taskDocument = (userId: string, taskId: string) => {
  if (!db) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  return doc(db, "users", userId, "habits", taskId);
};

const fromSnapshot = (id: string, data: Record<string, unknown>): Task => ({
  id,
  title: String(data.title ?? ""),
  notes: typeof data.notes === "string" ? data.notes : "",
  category: typeof data.category === "string" ? data.category : "Personal",
  schedule: (data.schedule as TaskSchedule | undefined) ?? "daily",
  priority: (data.priority as TaskPriority | undefined) ?? "medium",
  dueDate: typeof data.dueDate === "string" ? data.dueDate : null,
  createdDate: typeof data.createdDate === "string" ? data.createdDate : undefined,
  completions: Array.isArray(data.completions) ? data.completions.filter((item): item is string => typeof item === "string") : [],
});

export function subscribeToTasks(userId: string, onChange: (tasks: Task[]) => void, onError: (message: string) => void) {
  return onSnapshot(
    query(tasksCollection(userId), orderBy("createdAt", "asc")),
    (snapshot) => onChange(snapshot.docs.map((item) => fromSnapshot(item.id, item.data()))),
    (error) => onError(error.message.replace("FirebaseError: ", "")),
  );
}

export function subscribeToTask(userId: string, taskId: string, onChange: (task: Task | null) => void, onError: (message: string) => void) {
  return onSnapshot(
    taskDocument(userId, taskId),
    (snapshot) => onChange(snapshot.exists() ? fromSnapshot(snapshot.id, snapshot.data()) : null),
    (error) => onError(error.message.replace("FirebaseError: ", "")),
  );
}

export async function createTask(userId: string, task: TaskDraft) {
  const taskRef = doc(tasksCollection(userId));
  await setDoc(taskRef, { ...task, title: task.title.trim(), notes: task.notes.trim(), createdDate: new Date().toISOString().slice(0, 10), completions: [], createdAt: serverTimestamp() });
}

export async function updateTask(userId: string, taskId: string, task: TaskDraft) {
  await updateDoc(taskDocument(userId, taskId), { ...task, title: task.title.trim(), notes: task.notes.trim() });
}

export async function setTaskCompleted(userId: string, taskId: string, date: string, completed: boolean) {
  await updateDoc(taskDocument(userId, taskId), { completions: completed ? arrayUnion(date) : arrayRemove(date) });
}

export async function removeTask(userId: string, taskId: string) {
  await deleteDoc(taskDocument(userId, taskId));
}

export const subscribeToHabits = subscribeToTasks;
export const createHabit = createTask;
export const updateHabit = updateTask;
export const setHabitCompleted = setTaskCompleted;
export const removeHabit = removeTask;
