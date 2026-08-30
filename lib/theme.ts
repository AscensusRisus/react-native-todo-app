import { MD3LightTheme, type MD3Theme } from "react-native-paper";

export const colors = {
  ink: "#17201B",
  muted: "#66736B",
  canvas: "#F4F6F2",
  surface: "#FFFFFF",
  line: "#DDE4DC",
  primary: "#1D6B4F",
  primarySoft: "#DDEFE6",
  accent: "#D9853B",
  danger: "#B64242",
  dangerSoft: "#FBE7E5",
  warning: "#8A5A12",
  warningSoft: "#FFF0D6",
};

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: "#0A3B29",
    secondary: colors.accent,
    background: colors.canvas,
    surface: colors.surface,
    surfaceVariant: "#E9EEE9",
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    outline: "#78847C",
    outlineVariant: colors.line,
    error: colors.danger,
    errorContainer: colors.dangerSoft,
  },
};

export const categoryColors: Record<string, string> = {
  Personal: "#1D6B4F",
  Work: "#3568A8",
  Health: "#9A5D22",
  Home: "#7656A5",
};
