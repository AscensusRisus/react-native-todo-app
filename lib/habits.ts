import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseSetupError } from "./firebase";
import { dateKey, isDateKey, isTaskCategory, isTaskPriority, isTaskSchedule, nextCompletionDates, validateTaskDraft, type TaskDraft } from "./task-domain";

export type { TaskDraft, TaskPriority, TaskSchedule } from "./task-domain";
export { dateAfter, dateKey, defaultTaskDraft, dueDateLabel, isDateKey, isTaskCategory, isTaskCompletedOnDate, isTaskOpenToday, isTaskPriority, isTaskSchedule, lastSevenDays, longestStreak, nextCompletionDates, scheduleLabel, shouldShowToday, streakFor, taskDateState, todayKey, validateTaskDraft } from "./task-domain";

export type Task = TaskDraft & {
  id: string;
  createdDate?: string;
  completions: string[];
};

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
  category: isTaskCategory(data.category) ? data.category : "Personal",
  schedule: isTaskSchedule(data.schedule) ? data.schedule : "daily",
  priority: isTaskPriority(data.priority) ? data.priority : "medium",
  dueDate: typeof data.dueDate === "string" && isDateKey(data.dueDate) ? data.dueDate : null,
  createdDate: typeof data.createdDate === "string" && isDateKey(data.createdDate) ? data.createdDate : undefined,
  completions: Array.isArray(data.completions) ? data.completions.filter((item): item is string => typeof item === "string" && isDateKey(item)) : [],
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
  const validationError = validateTaskDraft(task);
  if (validationError) throw new Error(validationError);
  const taskRef = doc(tasksCollection(userId));
  await setDoc(taskRef, { ...task, title: task.title.trim(), notes: task.notes.trim(), createdDate: dateKey(), completions: [], createdAt: serverTimestamp() });
}

export async function updateTask(userId: string, taskId: string, task: TaskDraft) {
  const validationError = validateTaskDraft(task);
  if (validationError) throw new Error(validationError);
  await updateDoc(taskDocument(userId, taskId), { ...task, title: task.title.trim(), notes: task.notes.trim() });
}

export async function setTaskCompleted(userId: string, taskId: string, date: string, completed: boolean) {
  if (!isDateKey(date)) throw new Error("Completion date must be a real calendar date.");
  if (!db) throw new Error(firebaseSetupError ?? "Firebase is unavailable.");
  const ref = taskDocument(userId, taskId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("This task is no longer available.");
    const data = snapshot.data();
    const schedule = isTaskSchedule(data.schedule) ? data.schedule : "daily";
    const completions = Array.isArray(data.completions) ? data.completions.filter((item): item is string => typeof item === "string" && isDateKey(item)) : [];
    transaction.update(ref, { completions: nextCompletionDates({ schedule, completions }, date, completed) });
  });
}

export async function removeTask(userId: string, taskId: string) {
  await deleteDoc(taskDocument(userId, taskId));
}
