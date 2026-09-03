import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";
import { dateKey, shouldShowToday, type Task } from "@/lib/habits";
import { useAppTheme } from "@/lib/app-theme-context";

type CalendarDay = { key: string; date: Date; inMonth: boolean };
type TimeBlock = { task: Task; start: number; end: number };

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
const timeLabel = (minutes: number) => new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const suggestedBlocks = (tasks: Task[]): TimeBlock[] => tasks
  .slice()
  .sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0))
  .slice(0, 5)
  .map((task, index) => ({ task, start: 9 * 60 + index * 75, end: 9 * 60 + index * 75 + 60 }));

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
  const blocks = useMemo(() => suggestedBlocks(selectedItems), [selectedItems]);
  const move = (direction: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));

  return <Surface style={styles.card} elevation={0}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>CALENDAR</Text><Text variant="titleLarge" style={styles.heading}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text></View><View style={styles.actions}><Button compact mode="text" icon="chevron-left" accessibilityLabel="Previous month" onPress={() => move(-1)}> </Button><Button compact mode="text" icon="chevron-right" accessibilityLabel="Next month" onPress={() => move(1)}> </Button></View></View>
    <View style={styles.weekdays}>{Array.from({ length: 7 }, (_, index) => <Text key={index} style={styles.weekday}>{dayLabel(new Date(2024, 0, index + 7))}</Text>)}</View>
    <View style={styles.grid}>{days.map((day) => {
      const scheduled = tasks.filter((task) => scheduledOnDate(task, day.date)).length;
      const checked = tasks.filter((task) => task.completions.includes(day.key)).length;
      const isToday = day.key === dateKey(today);
      const isSelected = day.key === selectedKey;
      return <Pressable key={day.key} accessibilityLabel={`${longDate(day.date)}. ${scheduled} scheduled, ${checked} completed.`} onPress={() => setSelectedKey(day.key)} style={[styles.day, !day.inMonth && styles.otherMonth, isSelected && styles.selected, isToday && !isSelected && styles.today]}><Text style={[styles.dayNumber, !day.inMonth && styles.otherText, isSelected && styles.selectedText]}>{day.date.getDate()}</Text><View style={styles.dots}>{scheduled > 0 && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}{checked > 0 && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}</View></Pressable>;
    })}</View>
    <View style={styles.selection}><Text style={styles.selectionDate}>{longDate(selected)}</Text><Text style={styles.selectionCopy}>{selectedItems.length ? `${selectedItems.length} scheduled task${selectedItems.length === 1 ? "" : "s"}` : "Nothing scheduled"} · {completed.length} completed</Text></View>
    <View style={styles.blockHeader}><View><Text style={styles.blockEyebrow}>TIME-BLOCK PLAN</Text><Text style={styles.blockTitle}>Suggested focus windows</Text></View><Text style={styles.blockHint}>9 AM–3 PM</Text></View>
    {blocks.length ? <View style={styles.timeline}>{blocks.map((block) => <View key={block.task.id} style={styles.blockRow}><Text style={styles.time}>{timeLabel(block.start)}</Text><View style={styles.rail}><View style={[styles.block, block.task.completions.includes(selectedKey) && styles.blockDone]}><Text numberOfLines={1} style={styles.blockTask}>{block.task.completions.includes(selectedKey) ? "✓ " : ""}{block.task.title}</Text><Text style={styles.blockMeta}>{block.task.category ?? "Personal"} · {block.end - block.start} min</Text></View></View></View>)}</View> : <View style={styles.emptyPlan}><Text style={styles.emptyPlanText}>Add a task for this date to see a calm, time-blocked plan here.</Text></View>}
  </Surface>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string; primary: string; accent: string; primarySoft: string; canvas: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, actions: { flexDirection: "row" }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, heading: { color: colors.ink, fontWeight: "800", marginTop: 2 }, weekdays: { flexDirection: "row", marginTop: 17 }, weekday: { color: colors.muted, flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 }, day: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 }, otherMonth: { opacity: 0.4 }, today: { borderWidth: 1, borderColor: colors.primary }, selected: { backgroundColor: colors.primary }, dayNumber: { color: colors.ink, fontWeight: "700", fontVariant: ["tabular-nums"] }, otherText: { color: colors.muted }, selectedText: { color: "#FFFFFF" }, dots: { flexDirection: "row", gap: 3, height: 5, marginTop: 2 }, dot: { width: 4, height: 4, borderRadius: 2 },
  selection: { backgroundColor: colors.canvas, borderRadius: 14, padding: 12, marginTop: 14 }, selectionDate: { color: colors.ink, fontWeight: "800" }, selectionCopy: { color: colors.muted, marginTop: 2, fontSize: 12 },
  blockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18, marginBottom: 9 }, blockEyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, blockTitle: { color: colors.ink, fontWeight: "800", marginTop: 2 }, blockHint: { color: colors.muted, fontSize: 11 },
  timeline: { gap: 8 }, blockRow: { flexDirection: "row", alignItems: "stretch", minHeight: 58 }, time: { color: colors.muted, width: 60, paddingTop: 10, fontSize: 11, fontVariant: ["tabular-nums"] }, rail: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: 10 }, block: { flex: 1, borderRadius: 12, backgroundColor: colors.primarySoft, borderLeftWidth: 4, borderLeftColor: colors.primary, paddingHorizontal: 10, paddingVertical: 8 }, blockDone: { opacity: 0.68 }, blockTask: { color: colors.ink, fontWeight: "800" }, blockMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, emptyPlan: { borderLeftWidth: 1, borderLeftColor: colors.line, padding: 12, marginLeft: 60 }, emptyPlanText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
