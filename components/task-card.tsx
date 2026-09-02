import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Menu, Surface, Text } from "react-native-paper";
import { scheduleLabel, streakFor, type Task } from "@/lib/habits";
import { categoryColors, colors } from "@/lib/theme";

type TaskCardProps = {
  task: Task;
  today: string;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStartFocus: (task: Task) => void;
};

export function TaskCard({ task, today, onToggle, onEdit, onDelete, onStartFocus }: TaskCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const done = task.completions.includes(today);
  const accent = categoryColors[task.category ?? "Personal"] ?? colors.primary;
  const priorityLabel = task.priority === "high" ? "High priority" : task.priority === "low" ? "Low priority" : "Normal priority";
  const streak = streakFor(task.completions);

  return (
    <Surface style={[styles.card, done && styles.cardDone]} elevation={0}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => onToggle(task)} style={styles.pressable}>
        <View style={[styles.check, done && styles.checkDone]}>
          <MaterialCommunityIcons name={done ? "check" : "circle-outline"} size={done ? 18 : 22} color={done ? "#FFFFFF" : colors.muted} />
        </View>
        <View style={styles.copy}>
          <Text variant="titleMedium" style={[styles.title, done && styles.done]}>{task.title}</Text>
          {!!task.notes && <Text numberOfLines={2} style={styles.notes}>{task.notes}</Text>}
          <View style={styles.metaRow}>
            <Text style={[styles.category, { color: accent }]}>{task.category ?? "Personal"}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={[styles.meta, task.priority === "high" && styles.highPriority]}>{priorityLabel}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.meta}>{scheduleLabel(task.schedule)}</Text>
            {streak > 1 && <><Text style={styles.dot}>•</Text><Text style={styles.meta}>🔥 {streak} days</Text></>}
          </View>
        </View>
      </Pressable>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={<IconButton icon="dots-horizontal" accessibilityLabel={`Options for ${task.title}`} onPress={() => setMenuVisible(true)} />}
      >
        <Menu.Item leadingIcon={done ? "checkbox-blank-circle-outline" : "check-circle-outline"} title={done ? "Mark as to do" : "Mark as done"} onPress={() => { setMenuVisible(false); onToggle(task); }} />
        {!done && <Menu.Item leadingIcon="timer-outline" title="Start focus" onPress={() => { setMenuVisible(false); onStartFocus(task); }} />}
        <Menu.Item leadingIcon="pencil-outline" title="Edit task" onPress={() => { setMenuVisible(false); onEdit(task); }} />
        <Menu.Item leadingIcon="delete-outline" title="Delete task" onPress={() => { setMenuVisible(false); onDelete(task); }} />
      </Menu>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 90, flexDirection: "row", alignItems: "stretch", backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: "hidden", marginBottom: 10 },
  cardDone: { opacity: 0.72, backgroundColor: "#F8FAF7" },
  accent: { width: 5 },
  pressable: { flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingLeft: 14 },
  check: { width: 30, height: 30, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkDone: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary },
  copy: { flex: 1 },
  title: { color: colors.ink, fontWeight: "700" },
  done: { textDecorationLine: "line-through", color: colors.muted },
  notes: { color: colors.muted, marginTop: 3, lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" },
  category: { fontSize: 12, fontWeight: "800" },
  meta: { fontSize: 12, color: colors.muted },
  highPriority: { color: colors.danger, fontWeight: "700" },
  dot: { color: "#ABB4AE", marginHorizontal: 6 },
});
