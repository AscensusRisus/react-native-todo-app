import { StyleSheet, View } from "react-native";
import { Button, ProgressBar, Surface, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { ActiveTimer, IntervalKind } from "@/lib/focus-domain";
import { useAppTheme } from "@/lib/app-theme-context";

type Props = { timer: ActiveTimer | null; remaining: number | null; selectedKind: IntervalKind; durations: Record<IntervalKind, number>; onSelectKind: (kind: IntervalKind) => void; onStart: () => void; onPause: () => void; onResume: () => void; onEnd: () => void; disabled?: boolean };
const labelFor = (kind: IntervalKind) => kind === "focus" ? "Focus" : kind === "shortBreak" ? "Short break" : "Long break";

export function FocusTimer({ timer, remaining, selectedKind, durations, onSelectKind, onStart, onPause, onResume, onEnd, disabled }: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);
  const activeKind = timer?.kind ?? selectedKind;
  const seconds = remaining ?? durations[selectedKind];
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  const progress = Math.max(0, Math.min(1, 1 - seconds / (timer?.durationSeconds ?? durations[selectedKind])));
  const running = timer?.phase === "running";
  const visual: { icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; color: string } = activeKind === "focus" ? { icon: "brain", label: "Deep work", color: "#526FD4" } : activeKind === "shortBreak" ? { icon: "coffee-outline", label: "Reset gently", color: "#2D9C78" } : { icon: "weather-sunset", label: "Recover fully", color: "#D68A45" };
  return <Surface style={styles.card} elevation={0}>
    <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Interval type">
      {(["focus", "shortBreak", "longBreak"] as IntervalKind[]).map((kind) => <Button key={kind} compact mode={activeKind === kind ? "contained" : "text"} disabled={!!timer || disabled} onPress={() => onSelectKind(kind)} contentStyle={styles.presetContent} labelStyle={styles.presetLabel}>{labelFor(kind)}{!timer && ` · ${Math.round(durations[kind] / 60)} min`}</Button>)}
    </View>
    <View style={[styles.signal, { backgroundColor: `${visual.color}${isDark ? "33" : "18"}` }]}><MaterialCommunityIcons name={visual.icon} size={20} color={visual.color} /><Text style={[styles.signalText, { color: visual.color }]}>{visual.label}</Text></View>
    <Text accessibilityLabel={`${labelFor(activeKind)} timer, ${minutes} minutes ${remainder} seconds remaining`} style={styles.countdown}>{minutes}:{remainder}</Text>
    <Text style={styles.kind}>{labelFor(activeKind).toUpperCase()}</Text>
    <ProgressBar progress={progress} color={visual.color} style={styles.progress} />
    <View style={styles.controls}>
      {!timer ? <Button mode="contained" icon="play" disabled={disabled} onPress={onStart} style={styles.primary}>Start {labelFor(selectedKind).toLowerCase()}</Button> : running ? <Button mode="contained" icon="pause" onPress={onPause} style={styles.primary}>Pause</Button> : <Button mode="contained" icon="play" onPress={onResume} style={styles.primary}>Resume</Button>}
      {!!timer && <Button mode="outlined" icon={running ? "stop" : "refresh"} onPress={onEnd}>{running ? "End" : "Reset"}</Button>}
    </View>
  </Surface>;
}

const createStyles = (colors: { ink: string; muted: string; surface: string; line: string; primary: string; primarySoft: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 14 }, presets: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 }, presetContent: { minHeight: 34 }, presetLabel: { fontSize: 11 }, signal: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginTop: 18 }, signalText: { fontSize: 12, fontWeight: "800" }, countdown: { color: colors.ink, textAlign: "center", fontSize: 68, lineHeight: 76, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -2, marginTop: 12 }, kind: { color: colors.muted, textAlign: "center", fontSize: 11, letterSpacing: 1.2, fontWeight: "800", marginTop: 3 }, progress: { height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, marginTop: 24 }, controls: { flexDirection: "row", gap: 10, marginTop: 18 }, primary: { flex: 1 },
});
