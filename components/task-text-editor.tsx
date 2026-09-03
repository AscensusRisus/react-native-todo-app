import { useMemo, useState } from "react";
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
  const [mode, setMode] = useState<"write" | "preview">("write");
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const append = (addition: string) => onChangeText(value ? `${value}${value.endsWith("\n") ? "" : "\n"}${addition}` : addition);

  return <Surface style={styles.card} elevation={0}>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.label}>DETAILS</Text><Text style={styles.help}>Write a focused plan, checklist, links, or context.</Text></View><Text style={styles.count}>{words} words{"\n"}{value.length}/{maxLength}</Text></View>
    <View style={styles.modeRow} accessibilityLabel="Text editor mode"><Button compact mode={mode === "write" ? "contained" : "text"} onPress={() => setMode("write")}>Write</Button><Button compact mode={mode === "preview" ? "contained" : "text"} onPress={() => setMode("preview")}>Preview</Button></View>
    {mode === "write" ? <><View style={styles.toolbar} accessibilityLabel="Text editor tools">
      {additions.map((item) => <Button key={item.label} compact mode="outlined" onPress={() => append(item.value)} style={styles.tool}>{item.label}</Button>)}
    </View><TextInput
      label="Task details (optional)"
      value={value}
      onChangeText={onChangeText}
      maxLength={maxLength}
      multiline
      numberOfLines={7}
      mode="outlined"
      style={styles.input}
      contentStyle={styles.inputContent}
      placeholder="Outline the next steps, context, links, or a short checklist."
      textAlignVertical="top"
    /></> : <View style={styles.preview} accessibilityLabel="Task details preview">{value.trim() ? value.split("\n").map((line, index) => <Text key={`${line}-${index}`} style={[styles.previewLine, line.startsWith("## ") && styles.previewHeading, (line.startsWith("• ") || line.startsWith("☐ ")) && styles.previewList]}>{line.startsWith("## ") ? line.slice(3) : line}</Text>) : <Text style={styles.emptyPreview}>Nothing to preview yet. Switch to Write to add details.</Text>}</View>}
  </Surface>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string; primarySoft: string }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 14, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, headerCopy: { flex: 1, minWidth: 0 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.9 },
  help: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  count: { color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 1, minWidth: 58, lineHeight: 16 },
  modeRow: { flexDirection: "row", alignSelf: "flex-start", marginTop: 10, gap: 2 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12, marginBottom: 7 },
  tool: { borderColor: colors.line },
  input: { backgroundColor: colors.primarySoft, borderRadius: 12, minHeight: 154 },
  inputContent: { color: colors.ink, paddingTop: 10, minHeight: 132, lineHeight: 22 },
  preview: { minHeight: 154, marginTop: 7, backgroundColor: colors.primarySoft, borderRadius: 12, padding: 14 }, previewLine: { color: colors.ink, lineHeight: 22, minHeight: 22 }, previewHeading: { fontWeight: "800", fontSize: 16, marginTop: 7 }, previewList: { paddingLeft: 6 }, emptyPreview: { color: colors.muted, lineHeight: 21 },
});
