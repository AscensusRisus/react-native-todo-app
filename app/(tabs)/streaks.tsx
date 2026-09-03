import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { TaskCalendar } from "@/components/task-calendar";
import { useFocusSessions } from "@/hooks/use-focus-sessions";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/lib/auth-context";
import { useAppTheme } from "@/lib/app-theme-context";

export default function ProgressScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { tasks: habits, loading, error } = useTasks(user?.uid);
  const { summary: focusSummary } = useFocusSessions(user?.uid);

  const summary = useMemo(() => {
    const total = habits.reduce((sum, task) => sum + task.completions.length, 0);
    return { total };
  }, [habits]);

  return (
    <AppScreen>
      <Text style={styles.eyebrow}>YOUR MOMENTUM</Text>
      <Text variant="headlineMedium" style={styles.heading}>Progress</Text>
      <Text style={styles.lead}>Consistency is useful data, not a reason to judge a difficult day.</Text>

      <View style={styles.stats}>
        <Surface style={styles.stat} elevation={0}><MaterialCommunityIcons name="check-decagram-outline" size={24} color={colors.primary} /><Text variant="headlineSmall" style={styles.statNumber}>{summary.total}</Text><Text style={styles.statLabel}>check-ins</Text></Surface>
        <Surface style={styles.stat} elevation={0}><MaterialCommunityIcons name="timer-outline" size={24} color={colors.accent} /><Text variant="headlineSmall" style={styles.statNumber}>{focusSummary.focusedMinutes}</Text><Text style={styles.statLabel}>focus minutes today</Text></Surface>

      </View>

      <Text variant="titleLarge" style={styles.section}>Plan and activity</Text>
      {loading ? <ActivityIndicator style={styles.loader} /> : error ? <Text style={styles.error}>{error}</Text> : habits.length === 0 ? (
        <><TaskCalendar tasks={habits} /><Surface style={styles.empty} elevation={0}><Text variant="titleMedium" style={styles.taskTitle}>Your calendar is ready</Text><Text style={styles.muted}>Add a task to see its schedule and activity here.</Text></Surface></>
      ) : <TaskCalendar tasks={habits} />}
    </AppScreen>
  );
}

const makeStyles = (colors: { primary: string; accent: string; ink: string; muted: string; surface: string; line: string; danger: string }) => StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.1, fontWeight: "800", marginTop: 4 }, heading: { fontWeight: "800", color: colors.ink, marginTop: 5, letterSpacing: -0.5 }, lead: { color: colors.muted, lineHeight: 22, maxWidth: 480, marginTop: 7, marginBottom: 22 },
  stats: { flexDirection: "row", gap: 9, marginBottom: 28 }, stat: { flex: 1, minHeight: 120, borderRadius: 18, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, statNumber: { color: colors.ink, fontWeight: "800", marginTop: 8 }, statLabel: { color: colors.muted, fontSize: 12 }, section: { color: colors.ink, fontWeight: "800", marginBottom: 12 },
  taskTitle: { color: colors.ink, fontWeight: "700" }, muted: { color: colors.muted, marginTop: 2 }, empty: { padding: 24, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, loader: { marginTop: 48 }, error: { color: colors.danger },
});
