import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { ActiveTimer } from "./focus-domain";

export const FOCUS_NOTIFICATION_CHANNEL_ID = "focus-completion";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestNotificationPermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(FOCUS_NOTIFICATION_CHANNEL_ID, {
      name: "Focus completion",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return requested.granted || requested.status === "granted";
}

export async function scheduleFocusCompletionNotification(timer: ActiveTimer) {
  if (timer.phase !== "running" || timer.deadlineAtMs === null || timer.deadlineAtMs <= Date.now()) return null;
  if (!(await requestNotificationPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: timer.kind === "focus" ? "Focus round complete" : "Break complete",
      body: timer.kind === "focus" ? "Take a breath, then choose your next step." : "Ready when you are.",
      data: { screen: "focus", intervalId: timer.intervalId },
      sound: "default",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(timer.deadlineAtMs), channelId: FOCUS_NOTIFICATION_CHANNEL_ID },
  });
}

export async function cancelFocusCompletionNotification(notificationId: string | null | undefined) {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}
