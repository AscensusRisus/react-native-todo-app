import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Text } from "react-native-paper";
import { AppScreen } from "@/components/app-screen";
import { TaskForm } from "@/components/task-form";
import { useAuth } from "@/lib/auth-context";
import { dueDateLabel, removeTask, setTaskCompleted, taskDateState, todayKey, updateTask, type TaskDraft } from "@/lib/habits";
import { useTask } from "@/hooks/use-tasks";
import { colors } from "@/lib/theme";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { task, loading, error } = useTask(user?.uid, id);
  const [actionError, setActionError] = useState<string | null>(null);

  const save = async (draft: TaskDraft) => {
    if (!user || !task) return "This task is no longer available.";
    try {
      await updateTask(user.uid, task.id, draft);
      setActionError(null);
      router.back();
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : "Could not save this task.";
    }
  };

  const toggle = async () => {
    if (!user || !task) return;
    try {
      await setTaskCompleted(user.uid, task.id, todayKey(), !task.completions.includes(todayKey()));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not update this task.");
    }
  };

  const confirmDelete = () => Alert.alert("Delete task?", "This also deletes its completion history.", [
    { text: "Keep it", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      if (!user || !task) return;
      try {
        await removeTask(user.uid, task.id);
        router.replace("/");
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "Could not delete this task.");
      }
    } },
  ]);

  if (loading) return <AppScreen><ActivityIndicator style={styles.loader} /></AppScreen>;
  if (!task) return <AppScreen><Text variant="headlineSmall" style={styles.heading}>Task not found</Text><Text style={styles.lead}>{error ?? "It may have been deleted in another session."}</Text><Button mode="contained" onPress={() => router.replace("/")}>Back to today</Button></AppScreen>;

  const done = task.completions.includes(todayKey());
  const dateState = taskDateState(task);
  const initialValue: TaskDraft = { title: task.title, notes: task.notes, category: task.category, schedule: task.schedule, priority: task.priority, dueDate: task.dueDate };
  return (
    <AppScreen>
      <View style={styles.top}><IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => router.back()} /><Text style={styles.topTitle}>TASK DETAILS</Text><IconButton icon="delete-outline" iconColor={colors.danger} accessibilityLabel="Delete task" onPress={confirmDelete} /></View>
      <Text variant="headlineMedium" style={styles.heading}>{task.title}</Text>
      <View style={styles.statusRow}>{dateState !== "routine" && <Chip compact icon={dateState === "overdue" ? "alert-circle-outline" : "calendar"} style={dateState === "overdue" ? styles.overdue : styles.due}>{dateState === "overdue" ? `Overdue · ${dueDateLabel(task.dueDate)}` : `Due ${dueDateLabel(task.dueDate)}`}</Chip>}<Chip compact icon={done ? "check" : "circle-outline"}>{done ? "Done today" : "Open"}</Chip></View>
      <Button mode={done ? "outlined" : "contained"} icon={done ? "undo" : "check"} onPress={toggle} style={styles.complete}>{done ? "Mark as to do" : "Mark done for today"}</Button>
      {actionError && <Text style={styles.error}>{actionError}</Text>}
      <TaskForm key={task.id} initialValue={initialValue} onSubmit={save} submitLabel="Save changes" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  top: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, topTitle: { color: colors.muted, letterSpacing: 1.1, fontWeight: "800", fontSize: 11 }, heading: { color: colors.ink, fontWeight: "800", letterSpacing: -0.5 }, lead: { color: colors.muted, marginVertical: 8 }, statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, overdue: { backgroundColor: colors.dangerSoft }, due: { backgroundColor: colors.warningSoft }, complete: { marginTop: 18, marginBottom: 12 }, error: { color: colors.danger, marginBottom: 12 }, loader: { marginTop: 80 },
});
