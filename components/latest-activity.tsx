import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Surface, Text } from "react-native-paper";
import type { FocusSession } from "@/lib/focus-sessions";
import type { Task } from "@/lib/habits";
import { useAppTheme } from "@/lib/app-theme-context";

type Activity = { id: string; title: string; detail: string; timestamp: number; icon: "check" | "timer-outline"; color: string };

const fromDateKey = (key: string) => new Date(`${key}T12:00:00`).getTime();

export function LatestActivity({ tasks, sessions }: { tasks: Task[]; sessions: FocusSession[] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activity = useMemo<Activity[]>(() => {
    const taskEvents = tasks.flatMap((task) => task.completions.map((date) => ({ id: `task-${task.id}-${date}`, title: "Task completed", detail: task.title, timestamp: fromDateKey(date), icon: "check" as const, color: colors.primary })));
    const focusEvents = sessions.filter((session) => session.kind === "focus" && session.status === "completed").map((session) => ({ id: `focus-${session.id}`, title: "Focus round finished", detail: `${Math.round(session.focusedSeconds / 60)} min${session.taskTitleSnapshot ? ` · ${session.taskTitleSnapshot}` : ""}`, timestamp: session.endedAtMs ?? fromDateKey(session.localDate), icon: "timer-outline" as const, color: colors.accent }));
    return [...taskEvents, ...focusEvents].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  }, [colors.accent, colors.primary, sessions, tasks]);

  return <Surface style={styles.card} elevation={0}>
    <Text style={styles.eyebrow}>LATEST ACTIVITY</Text>
    <Text variant="titleLarge" style={styles.heading}>Your recent wins</Text>
    {!activity.length ? <Text style={styles.empty}>Finish a task or focus round and it will appear here.</Text> : activity.map((item) => <View key={item.id} style={styles.row}><View style={[styles.icon, { backgroundColor: `${item.color}22` }]}><MaterialCommunityIcons name={item.icon} size={18} color={item.color} /></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text numberOfLines={1} style={styles.detail}>{item.detail}</Text></View><Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text></View>)}
  </Surface>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 16 }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heading: { color: colors.ink, fontWeight: "800", marginTop: 3, marginBottom: 12 }, empty: { color: colors.muted, lineHeight: 20 }, row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, gap: 10 }, icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { color: colors.ink, fontWeight: "700" }, detail: { color: colors.muted, fontSize: 12, marginTop: 1 }, date: { color: colors.muted, fontSize: 11 },
});
