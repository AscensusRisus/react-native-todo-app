import { AuthProvider, useAuth } from "@/lib/auth-context";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider, useAppTheme } from "@/lib/app-theme-context";
import { View } from "react-native";


function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const { colors } = useAppTheme();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === "auth"

    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    }else if (user && inAuthGroup && !isLoadingUser){
      router.replace("/");
    }
  }, [user, isLoadingUser, router, segments]);
  if (isLoadingUser) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}><ActivityIndicator color={colors.primary} /></View>;
  if ((!user && segments[0] !== "auth") || (user && segments[0] === "auth")) return null;
  return <>{children}</>;
}

function ThemedRootLayout() {
  const router = useRouter();
  const { theme, colors, isDark } = useAppTheme();

  useEffect(() => {
    let alive = true;
    const openNotificationRoute = (response: Notifications.NotificationResponse) => {
      if (response.notification.request.content.data?.screen !== "focus") return;
      router.push("/focus");
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationRoute);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (alive && response) openNotificationRoute(response); }).catch(() => undefined);
    return () => { alive = false; subscription.remove(); };
  }, [router]);

  return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
         <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.canvas} />
         <RouteGuard>
            <Stack screenOptions={{ contentStyle: { backgroundColor: colors.canvas } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="task/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
            </Stack>
          </RouteGuard>
        </SafeAreaProvider>
      </PaperProvider>
  );
}

export default function RootLayout() { return <AuthProvider><AppThemeProvider><ThemedRootLayout /></AppThemeProvider></AuthProvider>; }
