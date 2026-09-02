import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appTheme, colors, createAppTheme, darkColors, type AppColors } from "./theme";

type ThemeMode = "system" | "light" | "dark";
type ThemeContextValue = { colors: AppColors; theme: typeof appTheme; isDark: boolean; mode: ThemeMode; setMode: (mode: ThemeMode) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const KEY = "donewell:theme-mode:v1";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setCurrentMode] = useState<ThemeMode>("system");
  useEffect(() => { void AsyncStorage.getItem(KEY).then((saved) => { if (saved === "light" || saved === "dark" || saved === "system") setCurrentMode(saved); }).catch(() => undefined); }, []);
  const setMode = useCallback(async (next: ThemeMode) => { setCurrentMode(next); await AsyncStorage.setItem(KEY, next); }, []);
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const value = useMemo(() => ({ colors: isDark ? darkColors : colors, theme: isDark ? createAppTheme(darkColors, true) : appTheme, isDark, mode, setMode }), [isDark, mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be inside AppThemeProvider");
  return value;
}
