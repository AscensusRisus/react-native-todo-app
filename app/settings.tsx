import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, IconButton, Surface, Text } from "react-native-paper";
import { AppScreen } from "@/components/app-screen";
import { useAppTheme } from "@/lib/app-theme-context";
import { useAuth } from "@/lib/auth-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, resetPassword, signOut } = useAuth();
  const { colors, mode, setMode } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [notice, setNotice] = useState<string | null>(null);

  const sendReset = async () => {
    if (!user?.email) return;
    const error = await resetPassword(user.email);
    setNotice(error ?? "Password-reset email sent. Check your inbox.");
  };
  const confirmSignOut = () => Alert.alert("Sign out?", "Your tasks remain safely in your account.", [{ text: "Stay", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => void signOut() }]);

  return <AppScreen><View style={styles.top}><IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => router.back()} /><Text style={styles.eyebrow}>SETTINGS</Text></View><Text variant="headlineMedium" style={styles.heading}>Your space</Text><Text style={styles.lead}>Keep the app comfortable and your account in your control.</Text>
    <View style={styles.content}>
        <Surface style={styles.card} elevation={0}><Text style={styles.cardLabel}>PROFILE</Text><Text variant="titleMedium" style={styles.email}>{user?.email ?? "No signed-in account"}</Text><Text style={styles.copy}>Your task history is associated with this verified account.</Text><Button mode="outlined" icon="email-fast-outline" onPress={() => void sendReset()} disabled={!user?.email}>Reset password</Button></Surface>
        <Surface style={styles.card} elevation={0}><Text style={styles.cardLabel}>APPEARANCE</Text><Text variant="titleMedium" style={styles.cardTitle}>Theme</Text><Text style={styles.copy}>Choose how Donewell looks everywhere in the app.</Text><View style={styles.modes}>{(["system", "light", "dark"] as const).map((item) => <Button key={item} compact mode={mode === item ? "contained" : "outlined"} onPress={() => void setMode(item)}>{item === "system" ? "System" : item === "light" ? "Light" : "Dark"}</Button>)}</View></Surface>
        <Surface style={styles.card} elevation={0}><Text style={styles.cardLabel}>ACCOUNT</Text><Text variant="titleMedium" style={styles.cardTitle}>Session</Text><Text style={styles.copy}>Signing out only removes this device session; it does not delete your work.</Text><Button mode="outlined" textColor={colors.danger} icon="logout-variant" onPress={confirmSignOut}>Sign out</Button></Surface>
    </View>
    {notice && <Surface style={styles.notice} elevation={0}><Text style={styles.noticeText}>{notice}</Text></Surface>}
  </AppScreen>;
}

const makeStyles = (colors: { surface: string; line: string; ink: string; muted: string; primary: string; primarySoft: string; danger: string }) => StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", marginLeft: -12 }, eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.1, fontWeight: "800" }, heading: { color: colors.ink, fontWeight: "800", letterSpacing: -0.6, marginTop: 2 }, lead: { color: colors.muted, marginTop: 7, marginBottom: 20, lineHeight: 21 },
  content: { gap: 12, minWidth: 0 },
  card: { padding: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }, cardLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: "800" }, cardTitle: { color: colors.ink, fontWeight: "800", marginTop: 3 }, email: { color: colors.ink, fontWeight: "800", marginTop: 3 }, copy: { color: colors.muted, lineHeight: 19, fontSize: 12, marginTop: 5, marginBottom: 13 }, modes: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, notice: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.primarySoft }, noticeText: { color: colors.ink, lineHeight: 19 },
});
