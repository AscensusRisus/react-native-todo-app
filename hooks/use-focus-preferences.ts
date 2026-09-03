import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { IntervalKind } from "@/lib/focus-domain";
import { DEFAULT_INTERVAL_DURATIONS, FOCUS_PREFERENCES_STORAGE_KEY, isValidDuration, type FocusPreferences, validateFocusPreferences } from "@/lib/focus-preferences";

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
        if (mounted) setPreferences(restored ? { ...restored, alertSound: null } : initial);
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

  return { preferences, loading, error, setDuration };
}
