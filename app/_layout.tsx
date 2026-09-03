import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppThemeProvider, useAppTheme } from "@/lib/app-theme-context";
import { NavigationBar } from "expo-navigation-bar";
import { Platform } from "react-native";


function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup = segments[0] === "auth"

    if (!user && !inAuthGroup && !isLoadingUser) {
      router.replace("/auth");
    }else if (user && inAuthGroup && !isLoadingUser){
      router.replace("/");
    }
  }, [user, isLoadingUser, router, segments]);
  return <>{children}</>;
}

function ThemedRootLayout() {
  const { theme, colors, isDark } = useAppTheme();
  return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
         <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.canvas} hidden={Platform.OS === "android"} />
         {Platform.OS === "android" && <NavigationBar hidden style={isDark ? "light" : "dark"} />}
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
