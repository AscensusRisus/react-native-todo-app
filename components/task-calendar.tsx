import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";
import { dateKey, shouldShowToday, type Task } from "@/lib/habits";
import { useAppTheme } from "@/lib/app-theme-context";

type CalendarDay = { key: string; date: Date; inMonth: boolean };

function monthDays(anchor: Date): CalendarDay[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { key: dateKey(date), date, inMonth: date.getMonth() === anchor.getMonth() };
  });
}

const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "narrow" });
const longDate = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const scheduledOnDate = (task: Task, date: Date) => task.schedule === "once" ? task.dueDate === dateKey(date) : shouldShowToday(task, date);

export function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKey(today));
  const days = useMemo(() => monthDays(month), [month]);
  const selected = useMemo(() => new Date(`${selectedKey}T12:00:00`), [selectedKey]);
  const selectedItems = useMemo(() => tasks.filter((task) => scheduledOnDate(task, selected)), [selected, tasks]);
  const completed = useMemo(() => tasks.filter((task) => task.completions.includes(selectedKey)), [selectedKey, tasks]);
  const move = (direction: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + direction, 1);
    setMonth(next);
    setSelectedKey(dateKey(next));
  };

  return <Surface style={styles.card} elevation={0}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>CALENDAR</Text><Text variant="titleLarge" style={styles.heading}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text></View><View style={styles.actions}><Button compact mode="text" icon="chevron-left" accessibilityLabel="Previous month" onPress={() => move(-1)}> </Button><Button compact mode="text" icon="chevron-right" accessibilityLabel="Next month" onPress={() => move(1)}> </Button></View></View>
    <View style={styles.weekdays}>{Array.from({ length: 7 }, (_, index) => <Text key={index} style={styles.weekday}>{dayLabel(new Date(2024, 0, index + 7))}</Text>)}</View>
    <View style={styles.legend}><View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Scheduled</Text></View><View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.accent }]} /><Text style={styles.legendText}>Completed</Text></View></View>
    <View style={styles.grid}>{days.map((day) => {
      const scheduled = tasks.filter((task) => scheduledOnDate(task, day.date)).length;
      const checked = tasks.filter((task) => task.completions.includes(day.key)).length;
      const isToday = day.key === dateKey(today);
      const isSelected = day.key === selectedKey;
      return <Pressable key={day.key} accessibilityLabel={`${longDate(day.date)}. ${scheduled} scheduled, ${checked} completed.`} onPress={() => setSelectedKey(day.key)} style={[styles.day, !day.inMonth && styles.otherMonth, isSelected && styles.selected, isToday && !isSelected && styles.today]}><Text style={[styles.dayNumber, !day.inMonth && styles.otherText, isSelected && styles.selectedText]}>{day.date.getDate()}</Text><View style={styles.dots}>{scheduled > 0 && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}{checked > 0 && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}</View></Pressable>;
    })}</View>
    <View style={styles.selection}><Text style={styles.selectionDate}>{longDate(selected)}</Text><Text style={styles.selectionCopy}>{selectedItems.length ? `${selectedItems.length} scheduled task${selectedItems.length === 1 ? "" : "s"}` : "Nothing scheduled"} · {completed.length} completed</Text></View>
  </Surface>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string; primary: string; accent: string; canvas: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, actions: { flexDirection: "row" }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heading: { color: colors.ink, fontWeight: "800", marginTop: 2 }, weekdays: { flexDirection: "row", marginTop: 17 }, weekday: { color: colors.muted, flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800" },
  legend: { flexDirection: "row", gap: 14, marginTop: 11 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 5 }, legendText: { color: colors.muted, fontSize: 11 }, grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 }, day: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 }, otherMonth: { opacity: 0.4 }, today: { borderWidth: 1, borderColor: colors.primary }, selected: { backgroundColor: colors.primary }, dayNumber: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] }, otherText: { color: colors.muted }, selectedText: { color: "#FFFFFF" }, dots: { flexDirection: "row", gap: 3, height: 5, marginTop: 2 }, dot: { width: 4, height: 4, borderRadius: 2 },
  selection: { backgroundColor: colors.canvas, borderRadius: 14, padding: 12, marginTop: 14 }, selectionDate: { color: colors.ink, fontWeight: "800" }, selectionCopy: { color: colors.muted, marginTop: 2, fontSize: 12 },
});
