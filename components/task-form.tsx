import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Chip, SegmentedButtons, Surface, Text, TextInput } from "react-native-paper";
import { categories, dateAfter, defaultTaskDraft, todayKey, validateTaskDraft, type TaskDraft, type TaskSchedule } from "@/lib/task-domain";
import { categoryColors } from "@/lib/theme";
import { useAppTheme } from "@/lib/app-theme-context";

type Props = {
  initialValue?: TaskDraft;
  onSubmit: (task: TaskDraft) => Promise<string | null>;
  submitLabel: string;
  autoFocus?: boolean;
};

export function TaskForm({ initialValue = defaultTaskDraft, onSubmit, submitLabel, autoFocus = false }: Props) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [task, setTask] = useState<TaskDraft>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = <Key extends keyof TaskDraft>(key: Key, value: TaskDraft[Key]) => setTask((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const validationError = validateTaskDraft(task);
    if (validationError) return setError(validationError);
    setSaving(true);
    setError(null);
    try {
      const submitError = await onSubmit({ ...task, dueDate: task.schedule === "once" ? task.dueDate : null });
      if (submitError) setError(submitError);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface style={styles.form} elevation={0}>
      <TextInput label="What do you want to do?" value={task.title} onChangeText={(value) => update("title", value)} maxLength={80} mode="outlined" style={styles.input} autoFocus={autoFocus} returnKeyType="next" />
      <TextInput label="Task details (optional)" value={task.notes} onChangeText={(value) => update("notes", value)} maxLength={2000} multiline numberOfLines={6} mode="outlined" style={styles.notesInput} contentStyle={styles.notesContent} placeholder="Add context or the next step" textAlignVertical="top" />
      <Text style={styles.notesMeta}>{task.notes.trim() ? task.notes.trim().split(/\s+/).length : 0} words · {task.notes.length}/2000</Text>

      <Text variant="titleSmall" style={styles.label}>AREA</Text>
      <View style={styles.chips}>{categories.map((item) => <Chip key={item} selected={task.category === item} showSelectedCheck={false} onPress={() => update("category", item)} style={task.category === item ? { backgroundColor: `${categoryColors[item]}20` } : undefined} textStyle={task.category === item ? { color: categoryColors[item], fontWeight: "800" } : undefined}>{item}</Chip>)}</View>

      <Text variant="titleSmall" style={styles.label}>REPEAT</Text>
      <View style={styles.chips}>{(["daily", "weekdays", "weekends", "once"] as TaskSchedule[]).map((item) => <Chip key={item} selected={task.schedule === item} showSelectedCheck={false} onPress={() => update("schedule", item)}>{({ daily: "Daily", weekdays: "Weekdays", weekends: "Weekend", once: "One time" })[item]}</Chip>)}</View>

      {task.schedule === "once" && <>
        <Text variant="titleSmall" style={styles.label}>DUE DATE</Text>
        <TextInput label="YYYY-MM-DD" value={task.dueDate ?? ""} onChangeText={(value) => update("dueDate", value)} keyboardType="numbers-and-punctuation" mode="outlined" style={styles.input} />
        <View style={styles.chips}>
          <Chip compact selected={task.dueDate === todayKey()} showSelectedCheck={false} onPress={() => update("dueDate", todayKey())}>Today</Chip>
          <Chip compact selected={task.dueDate === dateAfter(1)} showSelectedCheck={false} onPress={() => update("dueDate", dateAfter(1))}>Tomorrow</Chip>
          <Chip compact selected={task.dueDate === dateAfter(7)} showSelectedCheck={false} onPress={() => update("dueDate", dateAfter(7))}>Next week</Chip>
        </View>
      </>}

      <Text variant="titleSmall" style={styles.label}>PRIORITY</Text>
      <SegmentedButtons value={task.priority} onValueChange={(value) => update("priority", value as TaskDraft["priority"])} buttons={[{ value: "low", label: "Low" }, { value: "medium", label: "Normal" }, { value: "high", label: "High" }]} density="small" />

      {error && <Text style={styles.error}>{error}</Text>}
      <Button mode="contained" contentStyle={styles.buttonContent} style={styles.save} onPress={save} loading={saving} disabled={saving}>{submitLabel}</Button>
    </Surface>
  );
}

const makeStyles = (colors: { muted: string; ink: string; surface: string; line: string; danger: string }) => StyleSheet.create({
  form: { backgroundColor: colors.surface, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.line }, input: { marginBottom: 14, backgroundColor: colors.surface }, notesInput: { marginBottom: 2, backgroundColor: colors.surface, minHeight: 140 }, notesContent: { color: colors.ink, paddingTop: 10, minHeight: 118, lineHeight: 22 }, notesMeta: { color: colors.muted, fontSize: 11, textAlign: "right", marginBottom: 12 }, label: { color: colors.muted, letterSpacing: 0.9, fontSize: 11, marginTop: 8, marginBottom: 10 }, chips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 }, save: { marginTop: 24 }, buttonContent: { height: 50 }, error: { color: colors.danger, marginTop: 14 },
});
