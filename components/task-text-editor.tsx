import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useAppTheme } from "@/lib/app-theme-context";

type Props = { value: string; onChangeText: (value: string) => void; maxLength?: number };

const additions = [
  { label: "Heading", value: "## " },
  { label: "Bullet", value: "• " },
  { label: "Check", value: "☐ " },
  { label: "Note", value: "Note: " },
];

export function TaskTextEditor({ value, onChangeText, maxLength = 2000 }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const append = (addition: string) => onChangeText(value ? `${value}${value.endsWith("\n") ? "" : "\n"}${addition}` : addition);

  return <Surface style={styles.card} elevation={0}>
    <View style={styles.header}><View><Text style={styles.label}>DETAILS</Text><Text style={styles.help}>Use headings, bullets, and check items to make a task actionable.</Text></View><Text style={styles.count}>{words} words · {value.length}/{maxLength}</Text></View>
    <View style={styles.toolbar} accessibilityLabel="Text editor tools">
      {additions.map((item) => <Button key={item.label} compact mode="outlined" onPress={() => append(item.value)} style={styles.tool}>{item.label}</Button>)}
    </View>
    <TextInput
      label="Task details (optional)"
      value={value}
      onChangeText={onChangeText}
      maxLength={maxLength}
      multiline
      numberOfLines={7}
      mode="flat"
      style={styles.input}
      contentStyle={styles.inputContent}
      placeholder="Outline the next steps, context, links, or a short checklist."
      textAlignVertical="top"
    />
  </Surface>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string; primarySoft: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, marginBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  help: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, maxWidth: 260 },
  count: { color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 1 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12, marginBottom: 7 },
  tool: { borderColor: colors.line },
  input: { backgroundColor: colors.primarySoft, borderRadius: 12, minHeight: 154 },
  inputContent: { color: colors.ink, paddingTop: 10, minHeight: 132, lineHeight: 22 },
});
