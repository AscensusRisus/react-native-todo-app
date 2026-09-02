import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, Surface, Text } from "react-native-paper";
import type { Task } from "@/lib/habits";
import { categoryColors, colors } from "@/lib/theme";

type Props = { tasks: Task[]; selectedTaskId: string | null; onSelect: (taskId: string | null) => void; disabled?: boolean };

export function TaskPicker({ tasks, selectedTaskId, onSelect, disabled = false }: Props) {
  const selected = tasks.find((task) => task.id === selectedTaskId) ?? null;
  return <Surface style={[styles.card, disabled && styles.disabled]} elevation={0}>
    <View style={[styles.accent, { backgroundColor: selected ? (categoryColors[selected.category] ?? colors.primary) : colors.line }]} />
    <View style={styles.copy}>
      <Text style={styles.label}>LINKED TASK</Text>
      <Text variant="titleMedium" style={styles.title}>{selected?.title ?? "Choose a task"}</Text>
      <Text style={styles.note}>{selected ? `${selected.category} · Focus will be recorded without completing it.` : "A task is required for a focus round."}</Text>
    </View>
    <TaskMenu tasks={tasks} selectedTaskId={selectedTaskId} onSelect={onSelect} disabled={disabled} />
  </Surface>;
}

function TaskMenu({ tasks, selectedTaskId, onSelect, disabled }: Props) {
  const [visible, setVisible] = useState(false);
  return <Menu visible={visible} onDismiss={() => setVisible(false)} anchor={<Button compact mode="text" disabled={disabled || !tasks.length} onPress={() => setVisible(true)}>{selectedTaskId ? "Change" : "Select"}</Button>}>
    {selectedTaskId && <Menu.Item title="No task (break)" onPress={() => { setVisible(false); onSelect(null); }} />}
    {tasks.map((task) => <Menu.Item key={task.id} title={task.title} leadingIcon={task.id === selectedTaskId ? "check" : "circle-outline"} onPress={() => { setVisible(false); onSelect(task.id); }} />)}
  </Menu>;
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", minHeight: 98, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  disabled: { opacity: 0.72 }, accent: { width: 5, alignSelf: "stretch" }, copy: { flex: 1, padding: 15 }, label: { color: colors.muted, fontWeight: "800", letterSpacing: 0.9, fontSize: 10 }, title: { color: colors.ink, fontWeight: "800", marginTop: 3 }, note: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
});
