import { StyleSheet, View } from "react-native";
import { Button, ProgressBar, Surface, Text } from "react-native-paper";
import type { ActiveTimer, IntervalKind } from "@/lib/focus-domain";
import { durationFor } from "@/lib/focus-domain";
import { colors } from "@/lib/theme";

type Props = { timer: ActiveTimer | null; remaining: number | null; selectedKind: IntervalKind; onSelectKind: (kind: IntervalKind) => void; onStart: () => void; onPause: () => void; onResume: () => void; onEnd: () => void; disabled?: boolean };
const labelFor = (kind: IntervalKind) => kind === "focus" ? "Focus" : kind === "shortBreak" ? "Short break" : "Long break";
const durationLabel = (kind: IntervalKind) => `${Math.round(durationFor(kind) / 60)} min`;

export function FocusTimer({ timer, remaining, selectedKind, onSelectKind, onStart, onPause, onResume, onEnd, disabled }: Props) {
  const activeKind = timer?.kind ?? selectedKind;
  const seconds = remaining ?? durationFor(selectedKind);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  const progress = Math.max(0, Math.min(1, 1 - seconds / (timer?.durationSeconds ?? durationFor(selectedKind))));
  const running = timer?.phase === "running";
  return <Surface style={styles.card} elevation={0}>
    <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Interval type">
      {(["focus", "shortBreak", "longBreak"] as IntervalKind[]).map((kind) => <Button key={kind} compact mode={activeKind === kind ? "contained" : "text"} disabled={!!timer || disabled} onPress={() => onSelectKind(kind)} contentStyle={styles.presetContent} labelStyle={styles.presetLabel}>{labelFor(kind)}{!timer && ` · ${durationLabel(kind)}`}</Button>)}
    </View>
    <Text accessibilityLiveRegion="polite" accessibilityLabel={`${labelFor(activeKind)} timer, ${minutes} minutes ${remainder} seconds remaining`} style={styles.countdown}>{minutes}:{remainder}</Text>
    <Text style={styles.kind}>{labelFor(activeKind).toUpperCase()}</Text>
    <ProgressBar progress={progress} color={colors.primary} style={styles.progress} />
    <View style={styles.controls}>
      {!timer ? <Button mode="contained" icon="play" disabled={disabled} onPress={onStart} style={styles.primary}>Start {labelFor(selectedKind).toLowerCase()}</Button> : running ? <Button mode="contained" icon="pause" onPress={onPause} style={styles.primary}>Pause</Button> : <Button mode="contained" icon="play" onPress={onResume} style={styles.primary}>Resume</Button>}
      {!!timer && <Button mode="outlined" icon="stop" onPress={onEnd}>End</Button>}
    </View>
  </Surface>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 14 }, presets: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 }, presetContent: { minHeight: 34 }, presetLabel: { fontSize: 11 }, countdown: { color: colors.ink, textAlign: "center", fontSize: 64, lineHeight: 72, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -2, marginTop: 22 }, kind: { color: colors.primary, textAlign: "center", fontSize: 11, letterSpacing: 1.2, fontWeight: "800", marginTop: 3 }, progress: { height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, marginTop: 24 }, controls: { flexDirection: "row", gap: 10, marginTop: 18 }, primary: { flex: 1 },
});
