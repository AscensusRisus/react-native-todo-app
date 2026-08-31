import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Surface, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const validPassword = (password: string) =>
  password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { signIn, signUp, resetPassword, setupError } = useAuth();

  const handleAuth = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (isSignUp && !validPassword(password)) {
      return setError("Use 10+ characters with an uppercase letter, lowercase letter, and number.");
    }
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const authError = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (authError) return setError(authError);
    if (isSignUp) {
      setIsSignUp(false);
      setPassword("");
      setNotice("Account created. Check your inbox and verify your email before signing in.");
    } else {
      router.replace("/");
    }
  };

  const handleReset = async () => {
    if (!email.trim()) return setError("Enter your email first, then tap Forgot password.");
    setSubmitting(true);
    setError(null);
    const resetError = await resetPassword(email);
    setSubmitting(false);
    if (resetError) setError(resetError);
    else setNotice("Password-reset email sent. Check your inbox.");
  };

  const switchMode = () => {
    setIsSignUp((current) => !current);
    setError(null);
    setNotice(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.mark}><MaterialCommunityIcons name="check-bold" size={28} color="#FFFFFF" /></View>
            <Text variant="headlineLarge" style={styles.brandName}>Todo App</Text>
            <Text variant="bodyLarge" style={styles.tagline}>A calm place for the things you want to keep doing.</Text>
          </View>

          <Surface style={styles.card} elevation={1}>
            <Text variant="headlineSmall" style={styles.heading}>{isSignUp ? "Create your account" : "Welcome back"}</Text>
            <Text style={styles.subheading}>{isSignUp ? "We’ll email you a verification link." : "Sign in to continue your routine."}</Text>

            <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" mode="outlined" style={styles.input} />
            <TextInput label="Password" value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete={isSignUp ? "new-password" : "current-password"} secureTextEntry={!showPassword} mode="outlined" style={styles.input} right={<TextInput.Icon icon={showPassword ? "eye-off-outline" : "eye-outline"} onPress={() => setShowPassword((value) => !value)} />} onSubmitEditing={handleAuth} />
            {isSignUp && <HelperText type="info" visible>10+ characters · uppercase · lowercase · number</HelperText>}
            {(setupError || error) && <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} /><Text style={styles.errorText}>{setupError || error}</Text></View>}
            {notice && <View style={styles.noticeBox}><MaterialCommunityIcons name="email-check-outline" size={20} color={colors.primary} /><Text style={styles.noticeText}>{notice}</Text></View>}

            <Button mode="contained" contentStyle={styles.buttonContent} onPress={handleAuth} loading={submitting} disabled={submitting || Boolean(setupError)}>{isSignUp ? "Create account" : "Sign in"}</Button>
            {!isSignUp && <Button mode="text" onPress={handleReset} disabled={submitting}>Forgot password?</Button>}
          </Surface>

          <View style={styles.switchRow}>
            <Text>{isSignUp ? "Already have an account?" : "New here?"}</Text>
            <Button compact mode="text" onPress={switchMode}>{isSignUp ? "Sign in" : "Create account"}</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center", justifyContent: "center", padding: 24, paddingVertical: 40 },
  brand: { alignItems: "center", marginBottom: 28 },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, marginBottom: 12 },
  brandName: { color: colors.ink, fontWeight: "800", letterSpacing: -1 },
  tagline: { color: colors.muted, textAlign: "center", maxWidth: 330, marginTop: 8, lineHeight: 24 },
  card: { padding: 22, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  heading: { color: colors.ink, fontWeight: "700" },
  subheading: { color: colors.muted, marginTop: 5, marginBottom: 22 },
  input: { marginBottom: 12, backgroundColor: colors.surface },
  buttonContent: { height: 50 },
  errorBox: { flexDirection: "row", gap: 9, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSoft, marginBottom: 14 },
  errorText: { color: "#7D2929", flex: 1 },
  noticeBox: { flexDirection: "row", gap: 9, padding: 12, borderRadius: 12, backgroundColor: colors.primarySoft, marginBottom: 14 },
  noticeText: { color: "#174C39", flex: 1 },
  switchRow: { marginTop: 18, flexDirection: "row", justifyContent: "center", alignItems: "center" },
});
