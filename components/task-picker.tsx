import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, Surface, Text } from "react-native-paper";
import type { Task } from "@/lib/habits";
import { categoryColors } from "@/lib/theme";
import { useAppTheme } from "@/lib/app-theme-context";

type Props = { tasks: Task[]; selectedTaskId: string | null; onSelect: (taskId: string | null) => void; disabled?: boolean; allowNoTask?: boolean };

export function TaskPicker({ tasks, selectedTaskId, onSelect, disabled = false, allowNoTask = false }: Props) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const selected = tasks.find((task) => task.id === selectedTaskId) ?? null;
  return <Surface style={[styles.card, disabled && styles.disabled]} elevation={0}>
    <View style={[styles.accent, { backgroundColor: selected ? (categoryColors[selected.category] ?? colors.primary) : colors.line }]} />
    <View style={styles.copy}>
      <Text style={styles.label}>LINKED TASK</Text>
      <Text variant="titleMedium" style={styles.title}>{selected?.title ?? "Choose a task"}</Text>
      <Text style={styles.note}>{selected ? `${selected.category} · Focus will be recorded without completing it.` : allowNoTask ? "Breaks do not need a linked task." : "A task is required for a focus round."}</Text>
    </View>
    <TaskMenu tasks={tasks} selectedTaskId={selectedTaskId} onSelect={onSelect} disabled={disabled} allowNoTask={allowNoTask} />
  </Surface>;
}

function TaskMenu({ tasks, selectedTaskId, onSelect, disabled, allowNoTask }: Props) {
  const [visible, setVisible] = useState(false);
  const choose = (taskId: string | null) => {
    setVisible(false);
    requestAnimationFrame(() => onSelect(taskId));
  };
  return <Menu visible={visible} onDismiss={() => setVisible(false)} anchor={<Button compact mode="text" disabled={disabled || !tasks.length} onPress={() => setVisible(true)}>{selectedTaskId ? "Change" : "Select"}</Button>}>
    {(selectedTaskId || allowNoTask) && <Menu.Item title="No task (break)" onPress={() => choose(null)} />}
    {tasks.map((task) => <Menu.Item key={task.id} title={task.title} leadingIcon={task.id === selectedTaskId ? "check" : "circle-outline"} onPress={() => choose(task.id)} />)}
  </Menu>;
}

const makeStyles = (colors: { ink: string; muted: string; surface: string; line: string; primary: string }) => StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", minHeight: 98, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  disabled: { opacity: 0.72 }, accent: { width: 5, alignSelf: "stretch" }, copy: { flex: 1, padding: 15 }, label: { color: colors.muted, fontWeight: "800", letterSpacing: 0.9, fontSize: 10 }, title: { color: colors.ink, fontWeight: "800", marginTop: 3 }, note: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
});
