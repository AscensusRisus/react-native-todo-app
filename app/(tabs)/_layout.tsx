import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="check-circle-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="add-habit" options={{ title: "Add task", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="plus-circle" size={size + 4} color={color} /> }} />
      <Tabs.Screen name="focus" options={{ title: "Focus", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timer-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="streaks" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-timeline-variant" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: Platform.OS === "ios" ? 88 : 72,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    elevation: 8,
    shadowColor: "#17201B",
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  item: { paddingVertical: 2 },
  label: { fontSize: 12, fontWeight: "700" },
});
