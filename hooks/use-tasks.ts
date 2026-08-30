import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { subscribeToTask, subscribeToTasks, type Task } from "@/lib/habits";

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToTasks(userId, (nextTasks) => {
      setTasks(nextTasks);
      setError(null);
      setLoading(false);
    }, (message) => {
      setError(message);
      setLoading(false);
    });
  }, [refreshToken, userId]));

  return { tasks, loading, error, refresh: () => setRefreshToken((value) => value + 1) };
}

export function useTask(userId: string | undefined, taskId: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !taskId) {
      setTask(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToTask(userId, taskId, (nextTask) => {
      setTask(nextTask);
      setError(null);
      setLoading(false);
    }, (message) => {
      setError(message);
      setLoading(false);
    });
  }, [taskId, userId]);

  return { task, loading, error };
}
