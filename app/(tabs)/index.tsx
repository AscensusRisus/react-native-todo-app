import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, ProgressBar, Surface, Text } from "react-native-paper";
import { AppScreen } from "@/components/app-screen";
import { TaskCard } from "@/components/task-card";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/lib/auth-context";
import { dueDateLabel, removeTask, setTaskCompleted, shouldShowToday, taskDateState, todayKey, type Task } from "@/lib/habits";
import { useAppTheme } from "@/lib/app-theme-context";

type Filter = "all" | "open" | "done";

export default function TodayScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { tasks: habits, loading, error: loadError } = useTasks(user?.uid);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayKey();
  const error = actionError ?? loadError;

  const todaysTasks = useMemo(() => habits.filter((task) => shouldShowToday(task)), [habits]);
  const completed = todaysTasks.filter((task) => task.completions.includes(today)).length;
  const visibleTasks = todaysTasks.filter((task) => filter === "all" || (filter === "done") === task.completions.includes(today));
  const progress = todaysTasks.length ? completed / todaysTasks.length : 0;

  const toggleTask = async (task: Task) => {
    if (!user) return;
    try { await setTaskCompleted(user.uid, task.id, today, !task.completions.includes(today)); setActionError(null); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not update this task."); }
  };

  const confirmDelete = (task: Task) => Alert.alert("Delete task?", `Remove “${task.title}” and its completion history?`, [
    { text: "Keep it", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => user && removeTask(user.uid, task.id).then(() => setActionError(null)).catch((cause) => setActionError(cause instanceof Error ? cause.message : "Could not delete this task.")) },
  ]);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  return (
    <AppScreen>
      <View style={styles.topRow}>
        <View style={styles.topCopy}>
          <Text style={styles.eyebrow}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</Text>
          <Text variant="headlineMedium" style={styles.heading}>{greeting}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
        </View>
        <IconButton icon="account-cog-outline" mode="contained-tonal" accessibilityLabel="Open settings" onPress={() => router.push("/settings")} />
      </View>

      <Surface style={styles.progressCard} elevation={0}>
        <View style={styles.progressHeader}>
          <View><Text variant="titleMedium" style={styles.progressTitle}>Today’s rhythm</Text><Text style={styles.progressCopy}>{completed === todaysTasks.length && todaysTasks.length ? "Everything is done. Nice work." : `${todaysTasks.length - completed} left to complete`}</Text></View>
          <Text variant="headlineMedium" style={styles.percent}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} color={colors.primary} style={styles.progressBar} />
      </Surface>

      <View style={styles.sectionHeader}><Text variant="titleLarge" style={styles.sectionTitle}>Your tasks</Text><Button compact mode="text" icon="plus" onPress={() => router.navigate("/add-habit")}>New</Button></View>
      <View style={styles.filters}>
        {(["all", "open", "done"] as Filter[]).map((value) => <Chip key={value} selected={filter === value} onPress={() => setFilter(value)} showSelectedCheck={false}>{value === "all" ? `All ${todaysTasks.length}` : value === "open" ? `To do ${todaysTasks.length - completed}` : `Done ${completed}`}</Chip>)}
      </View>

      {error && <Surface style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></Surface>}
      {loading ? <ActivityIndicator style={styles.loader} /> : visibleTasks.length === 0 ? (
        <Surface style={styles.empty} elevation={0}>
          <View style={styles.emptyIcon}><MaterialCommunityIcons name={todaysTasks.length ? "check-all" : "clipboard-text-outline"} size={32} color={colors.primary} /></View>
          <Text variant="titleMedium" style={styles.emptyTitle}>{todaysTasks.length ? "Nothing in this view" : "Start with one doable task"}</Text>
          <Text style={styles.emptyText}>{todaysTasks.length ? "Try another filter to see your tasks." : "Build a routine without turning your day into a spreadsheet."}</Text>
          {!todaysTasks.length && <Button mode="contained" onPress={() => router.navigate("/add-habit")}>Add your first task</Button>}
        </Surface>
      ) : visibleTasks.map((task) => <TaskCard key={task.id} task={task} today={today} onToggle={(item) => void toggleTask(item)} onEdit={(item) => router.push({ pathname: "/task/[id]", params: { id: item.id } })} onDelete={confirmDelete} onStartFocus={(item) => router.push({ pathname: "/focus", params: { taskId: item.id } })} />)}
      {habits.filter((task) => taskDateState(task) === "upcoming").slice(0, 3).length > 0 && <View style={styles.upcoming}><Text variant="titleMedium" style={styles.upcomingTitle}>Coming up</Text>{habits.filter((task) => taskDateState(task) === "upcoming").slice(0, 3).map((task) => <Button key={task.id} compact mode="text" icon="calendar-clock" onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })}>{dueDateLabel(task.dueDate)} · {task.title}</Button>)}</View>}
    </AppScreen>
  );
}

const makeStyles = (colors: { primary: string; ink: string; muted: string; primarySoft: string; surface: string; line: string; danger: string; dangerSoft: string }) => StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, topCopy: { flex: 1, paddingRight: 10 }, eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.1, fontWeight: "800" }, heading: { color: colors.ink, fontWeight: "800", letterSpacing: -0.6, marginTop: 4 }, email: { color: colors.muted, marginTop: 2 },
  progressCard: { backgroundColor: colors.primarySoft, borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: colors.line }, progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, progressTitle: { color: colors.ink, fontWeight: "700" }, progressCopy: { color: colors.muted, marginTop: 3 }, percent: { color: colors.primary, fontWeight: "800" }, progressBar: { height: 9, borderRadius: 5, backgroundColor: colors.line },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: colors.ink, fontWeight: "800" }, filters: { flexDirection: "row", gap: 8, marginVertical: 14, flexWrap: "wrap" },
  empty: { alignItems: "center", padding: 30, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line }, emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, marginBottom: 15 }, emptyTitle: { fontWeight: "700", color: colors.ink }, emptyText: { textAlign: "center", color: colors.muted, marginTop: 6, marginBottom: 18, maxWidth: 330, lineHeight: 21 }, loader: { marginTop: 48 }, error: { flexDirection: "row", gap: 8, padding: 13, borderRadius: 14, backgroundColor: colors.dangerSoft, marginBottom: 12 }, errorText: { flex: 1, color: colors.danger },
  upcoming: { marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, upcomingTitle: { fontWeight: "700", color: colors.ink, marginBottom: 4 },
});
