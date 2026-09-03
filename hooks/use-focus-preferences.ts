import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { IntervalKind } from "@/lib/focus-domain";
import { DEFAULT_INTERVAL_DURATIONS, FOCUS_PREFERENCES_STORAGE_KEY, isValidDuration, type AlertSound, type FocusPreferences, validateFocusPreferences } from "@/lib/focus-preferences";

const supportedExtensions = /\.(mp3|m4a|aac|wav|ogg|webm)$/i;
const safeName = (name: string) => name.replace(/[^a-z0-9._-]/gi, "_").slice(-80) || "focus-alert.mp3";

export function useFocusPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<FocusPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaults = useCallback((): FocusPreferences | null => userId ? { version: 1, ownerUid: userId, durations: { ...DEFAULT_INTERVAL_DURATIONS }, alertSound: null } : null, [userId]);

  const persist = useCallback(async (next: FocusPreferences) => {
    setPreferences(next);
    await AsyncStorage.setItem(FOCUS_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const initial = defaults();
      if (!initial) { if (mounted) { setPreferences(null); setLoading(false); } return; }
      try {
        const raw = await AsyncStorage.getItem(FOCUS_PREFERENCES_STORAGE_KEY);
        const restored = raw ? validateFocusPreferences(JSON.parse(raw), initial.ownerUid) : null;
        if (!restored) await AsyncStorage.setItem(FOCUS_PREFERENCES_STORAGE_KEY, JSON.stringify(initial));
        if (mounted) setPreferences(restored ?? initial);
      } catch (cause) { if (mounted) { setPreferences(initial); setError(cause instanceof Error ? cause.message : "Could not restore focus settings."); } }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [defaults]);

  const setDuration = useCallback(async (kind: IntervalKind, seconds: number) => {
    if (!preferences || !isValidDuration(kind, seconds)) return false;
    await persist({ ...preferences, durations: { ...preferences.durations, [kind]: seconds } });
    return true;
  }, [persist, preferences]);

  const chooseAlertSound = useCallback(async () => {
    if (!preferences) return null;
    setError(null);
    if (Platform.OS === "android") {
      try {
        const result = await IntentLauncher.startActivityAsync("android.intent.action.RINGTONE_PICKER", {
          extra: {
            "android.intent.extra.ringtone.TYPE": 2,
            "android.intent.extra.ringtone.SHOW_DEFAULT": true,
            "android.intent.extra.ringtone.SHOW_SILENT": false,
          },
        });
        const picked = result.extra as { "android.intent.extra.ringtone.PICKED_URI"?: unknown } | undefined;
        const uri = typeof result.data === "string" ? result.data : typeof picked?.["android.intent.extra.ringtone.PICKED_URI"] === "string" ? picked["android.intent.extra.ringtone.PICKED_URI"] : null;
        if (result.resultCode !== IntentLauncher.ResultCode.Success || !uri) return null;
        const alertSound: AlertSound = { uri, name: "System notification sound", mimeType: null, source: "system" };
        await persist({ ...preferences, alertSound });
        return alertSound;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not open the system sound picker.");
        return null;
      }
    }
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset || (asset.mimeType && !asset.mimeType.startsWith("audio/")) || (!asset.mimeType && !supportedExtensions.test(asset.name))) { setError("Choose an audio file such as MP3, M4A, WAV, AAC, OGG, or WebM."); return null; }
    if (asset.size && asset.size > 15 * 1024 * 1024) { setError("Choose an alert sound smaller than 15 MB."); return null; }
    try {
      const fileName = `focus-alert-${Date.now()}-${safeName(asset.name)}`;
      const destination = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${fileName}` : asset.uri;
      if (destination !== asset.uri) await FileSystem.copyAsync({ from: asset.uri, to: destination });
      const alertSound: AlertSound = { uri: destination, name: asset.name, mimeType: asset.mimeType ?? null, source: "file" };
      await persist({ ...preferences, alertSound });
      return alertSound;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save that alert sound."); return null; }
  }, [persist, preferences]);

  const clearAlertSound = useCallback(async () => {
    if (!preferences) return;
    const existing = preferences.alertSound;
    await persist({ ...preferences, alertSound: null });
    if (existing?.source !== "system" && existing?.uri.startsWith(FileSystem.documentDirectory ?? "__none__")) await FileSystem.deleteAsync(existing.uri, { idempotent: true }).catch(() => undefined);
  }, [persist, preferences]);

  return { preferences, loading, error, setDuration, chooseAlertSound, clearAlertSound };
}
