import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "react-native-paper";
import { AppScreen } from "@/components/app-screen";
import { TaskForm } from "@/components/task-form";
import { useAuth } from "@/lib/auth-context";
import { createTask, type TaskDraft } from "@/lib/habits";
import { colors } from "@/lib/theme";

export default function AddTaskScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const create = async (task: TaskDraft) => {
    if (!user) return "You need to sign in before adding a task.";
    try {
      await createTask(user.uid, task);
      router.replace("/");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save this task.";
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AppScreen>
        <Text style={styles.eyebrow}>BUILD YOUR ROUTINE</Text>
        <Text variant="headlineMedium" style={styles.heading}>Add a task</Text>
        <Text style={styles.lead}>A useful task is small enough to start and clear enough to finish.</Text>
        <TaskForm onSubmit={create} submitLabel="Save task" autoFocus />
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.1, fontWeight: "800", marginTop: 4 }, heading: { fontWeight: "800", color: colors.ink, marginTop: 5, letterSpacing: -0.5 }, lead: { color: colors.muted, lineHeight: 22, maxWidth: 450, marginTop: 7, marginBottom: 22 },
});
