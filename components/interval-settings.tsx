import { StyleSheet, View } from "react-native";
import { IconButton, Surface, Text } from "react-native-paper";
import type { IntervalKind } from "@/lib/focus-domain";
import { minutesFor, type IntervalDurations } from "@/lib/focus-preferences";
import { useAppTheme } from "@/lib/app-theme-context";

type Props = { durations: IntervalDurations; disabled?: boolean; onChange: (kind: IntervalKind, seconds: number) => void };
const definitions: { kind: IntervalKind; label: string; icon: string; color: string }[] = [
  { kind: "focus", label: "Focus", icon: "brain", color: "#3459A8" },
  { kind: "shortBreak", label: "Short", icon: "coffee-outline", color: "#16745B" },
  { kind: "longBreak", label: "Long", icon: "weather-sunset", color: "#9B5A23" },
];

export function IntervalSettings({ durations, disabled = false, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return <View style={styles.section}>
    <View style={styles.headingRow}><Text style={styles.eyebrow}>YOUR RHYTHM</Text><Text style={styles.hint}>{disabled ? "Locked while an interval runs" : "Tap to adjust minutes"}</Text></View>
    <View style={styles.row}>
      {definitions.map(({ kind, label, icon, color }) => <Surface key={kind} style={[styles.card, disabled && styles.disabled]} elevation={0}>
        <Text style={[styles.icon, { color }]}>{icon === "brain" ? "●" : icon === "coffee-outline" ? "◐" : "◒"}</Text>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.adjust}><IconButton icon="minus" size={16} disabled={disabled} accessibilityLabel={`Decrease ${label} duration`} onPress={() => onChange(kind, durations[kind] - 60)} /><Text style={styles.minutes}>{minutesFor(durations[kind])}</Text><IconButton icon="plus" size={16} disabled={disabled} accessibilityLabel={`Increase ${label} duration`} onPress={() => onChange(kind, durations[kind] + 60)} /></View>
        <Text style={styles.unit}>MIN</Text>
      </Surface>)}
    </View>
  </View>;
}

const makeStyles = (colors: { ink: string; muted: string; surface: string; line: string }) => StyleSheet.create({
  section: { marginTop: 20 }, headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, hint: { color: colors.muted, fontSize: 11 }, row: { flexDirection: "row", gap: 8 }, card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 10, alignItems: "center" }, disabled: { opacity: 0.55 }, icon: { fontSize: 17, lineHeight: 18 }, label: { color: colors.ink, fontWeight: "700", fontSize: 12, marginTop: 3 }, adjust: { flexDirection: "row", alignItems: "center", marginTop: -3 }, minutes: { color: colors.ink, fontVariant: ["tabular-nums"], fontSize: 20, fontWeight: "800", minWidth: 24, textAlign: "center" }, unit: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: -5 },
});
