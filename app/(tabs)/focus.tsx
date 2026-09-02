import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, Surface, Text, TextInput } from "react-native-paper";
import { AppScreen } from "@/components/app-screen";
import { FocusTimer } from "@/components/focus-timer";
import { IntervalSettings } from "@/components/interval-settings";
import { TaskPicker } from "@/components/task-picker";
import { playAlertSound } from "@/lib/alert-sound";
import { DEFAULT_INTERVAL_DURATIONS } from "@/lib/focus-preferences";
import { useFocusSessions } from "@/hooks/use-focus-sessions";
import { useFocusPreferences } from "@/hooks/use-focus-preferences";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useTasks } from "@/hooks/use-tasks";
import { setTaskCompleted, shouldShowToday, todayKey } from "@/lib/habits";
import type { IntervalKind } from "@/lib/focus-domain";
import { useAuth } from "@/lib/auth-context";
import { useAppTheme } from "@/lib/app-theme-context";

export default function FocusScreen() {
  const { taskId: routeTaskId } = useLocalSearchParams<{ taskId?: string }>();
  const { user } = useAuth();
  const { colors, isDark, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const { tasks, loading, error: tasksError } = useTasks(user?.uid);
  const { summary, error: sessionsError } = useFocusSessions(user?.uid);
  const { preferences, loading: preferencesLoading, error: preferencesError, setDuration, chooseAlertSound, clearAlertSound } = useFocusPreferences(user?.uid);
  const { timer, remainingSeconds, finishedTimer, pendingCount, pendingSessions, syncError, restoring, start, pause, resume, end, unlinkTask, dismissFinished, retryPending } = useFocusTimer(user?.uid);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [kind, setKind] = useState<IntervalKind>("focus");
  const [intention, setIntention] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const handledRouteTaskId = useRef<string | undefined>(undefined);
  const openTodayTasks = useMemo(() => tasks.filter((task) => shouldShowToday(task) && !task.completions.includes(todayKey())), [tasks]);
  const selectedTask = openTodayTasks.find((task) => task.id === selectedTaskId) ?? null;
  const activeTask = timer?.taskId ? tasks.find((task) => task.id === timer.taskId) ?? null : null;
  const finishedTask = finishedTimer?.taskId ? tasks.find((task) => task.id === finishedTimer.taskId) ?? null : null;
  const timerTaskMissing = !!timer?.taskId && !activeTask;
  const timerTaskDone = !!activeTask?.completions.includes(todayKey());
  const displayedSummary = useMemo(() => {
    const pendingFocus = pendingSessions.filter((session) => session.localDate === todayKey() && session.status === "completed" && session.kind === "focus");
    return { rounds: summary.rounds + pendingFocus.length, focusedMinutes: summary.focusedMinutes + Math.floor(pendingFocus.reduce((total, session) => total + session.focusedSeconds, 0) / 60) };
  }, [pendingSessions, summary]);

  useEffect(() => {
    if (timer?.taskId && !loading && !activeTask) void unlinkTask(timer.taskId);
  }, [activeTask, loading, timer?.taskId, unlinkTask]);

  useFocusEffect(useCallback(() => { void retryPending(); }, [retryPending]));

  useEffect(() => {
    if (!routeTaskId || routeTaskId === handledRouteTaskId.current || timer) return;
    if (loading) return;
    handledRouteTaskId.current = routeTaskId;
    const candidate = openTodayTasks.find((task) => task.id === routeTaskId);
    if (candidate) setSelectedTaskId(candidate.id);
    else setActionError("That task is no longer open for today. Choose another task to focus on.");
  }, [loading, openTodayTasks, routeTaskId, timer]);

  const startTimer = async () => {
    if (kind === "focus" && !selectedTask) { setActionError("Choose an open task before starting a focus round."); return; }
    try {
      await start({ kind, taskId: selectedTask?.id ?? null, taskTitleSnapshot: selectedTask?.title ?? null, intention, durationSeconds: (preferences?.durations ?? DEFAULT_INTERVAL_DURATIONS)[kind], alertSound: preferences?.alertSound ?? null });
      setActionError(null);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not start the timer."); }
  };
  const requestEnd = () => { if (timer?.phase === "running") setConfirmingEnd(true); else void end(); };
  const endTimer = async () => { await end(); setConfirmingEnd(false); };
  const startBreak = async () => { dismissFinished(); setKind("shortBreak"); setIntention(""); await start({ kind: "shortBreak", taskId: null, taskTitleSnapshot: null, intention: "", durationSeconds: (preferences?.durations ?? DEFAULT_INTERVAL_DURATIONS).shortBreak, alertSound: preferences?.alertSound ?? null }); };
  const focusAgain = async () => {
    const task = finishedTimer?.taskId ? tasks.find((item) => item.id === finishedTimer.taskId) : null;
    if (!task || task.completions.includes(todayKey()) || !shouldShowToday(task)) { dismissFinished(); setSelectedTaskId(null); setKind("focus"); setActionError("Choose an open task before starting another focus round."); return; }
    dismissFinished(); setKind("focus"); setSelectedTaskId(task.id);
    await start({ kind: "focus", taskId: task.id, taskTitleSnapshot: task.title, intention, durationSeconds: (preferences?.durations ?? DEFAULT_INTERVAL_DURATIONS).focus, alertSound: preferences?.alertSound ?? null });
  };
  const markDone = async () => {
    if (!user || !finishedTimer?.taskId) return;
    try { await setTaskCompleted(user.uid, finishedTimer.taskId, todayKey(), true); dismissFinished(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not mark this task done."); }
  };
  const changeDuration = (nextKind: IntervalKind, seconds: number) => { void setDuration(nextKind, seconds).then((updated) => { if (!updated) setActionError("Use a duration within the allowed range."); }); };
  const chooseSound = async () => { const sound = await chooseAlertSound(); if (sound) await playAlertSound(sound).catch(() => setActionError("The sound was saved, but preview was not available on this device.")); };
  const error = actionError ?? tasksError ?? sessionsError ?? preferencesError ?? syncError;
  const displayTaskTitle = timer ? (activeTask?.title ?? timer.taskTitleSnapshot) : null;

  return <AppScreen>
    <Text style={styles.eyebrow}>FOCUS ON ONE THING</Text>
    <View style={styles.titleRow}><Text variant="headlineMedium" style={styles.heading}>Focus</Text><Button compact mode="text" icon={isDark ? "weather-sunny" : "weather-night"} onPress={() => void setMode(isDark ? "light" : "dark")}>{mode === "system" ? "Theme" : isDark ? "Light" : "Dark"}</Button></View>
    <Text style={styles.summary}>{displayedSummary.rounds} {displayedSummary.rounds === 1 ? "round" : "rounds"} · {displayedSummary.focusedMinutes} focused minutes</Text>
    {(pendingCount > 0 || syncError) && <Surface style={styles.sync} elevation={0}><Text style={styles.syncText}>Waiting to sync {pendingCount === 1 ? "1 session" : `${pendingCount} sessions`}. Your timer data is safe on this device.</Text></Surface>}
    {!!displayTaskTitle && <Surface style={styles.activeTask} elevation={0}><Text style={styles.activeTaskLabel}>FOCUSING ON</Text><Text variant="titleMedium" style={styles.activeTaskTitle}>{displayTaskTitle}{timerTaskDone ? " · completed" : ""}</Text>{timerTaskMissing && <Text style={styles.warning}>This task was deleted. The interval can finish, but choose another task for your next focus round.</Text>}</Surface>}
    {!timer && <>
      <TaskPicker tasks={openTodayTasks} selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} disabled={restoring} allowNoTask={kind !== "focus"} />
      {!openTodayTasks.length && !loading && <Surface style={styles.empty} elevation={0}><Text variant="titleMedium" style={styles.emptyTitle}>A task makes focus rounds useful</Text><Text style={styles.emptyCopy}>Add a task for today to begin a focus round. Breaks are still available.</Text><Button mode="outlined" onPress={() => router.navigate("/add-habit")}>Add task</Button></Surface>}
      <TextInput label="Focus intention (optional)" value={intention} onChangeText={(value) => setIntention(value.slice(0, 120))} maxLength={120} mode="outlined" style={styles.input} dense placeholder="Draft the opening section" />
      <HelperText type="info" visible>{intention.length}/120</HelperText>
      <IntervalSettings durations={preferences?.durations ?? DEFAULT_INTERVAL_DURATIONS} disabled={preferencesLoading} onChange={changeDuration} />
      <Surface style={styles.sound} elevation={0}><Text style={styles.soundTitle}>Interval alert</Text><Text style={styles.soundCopy}>{preferences?.alertSound ? preferences.alertSound.name : "Haptic confirmation only"}</Text><Button compact mode="text" icon="music-note-outline" onPress={() => void chooseSound()} disabled={preferencesLoading}>Choose sound</Button>{preferences?.alertSound && <Button compact mode="text" icon="close" onPress={() => void clearAlertSound()}>Use haptic only</Button>}</Surface>
    </>}
    <FocusTimer timer={timer} remaining={remainingSeconds} selectedKind={kind} durations={preferences?.durations ?? DEFAULT_INTERVAL_DURATIONS} onSelectKind={setKind} onStart={() => void startTimer()} onPause={() => void pause()} onResume={() => void resume()} onEnd={requestEnd} disabled={restoring || preferencesLoading || (kind === "focus" && !selectedTask)} />
    {confirmingEnd && <Surface style={styles.endConfirm} elevation={0}><Text variant="titleMedium" style={styles.endTitle}>End this interval?</Text><Text style={styles.endCopy}>Focus time is saved only after one minute. This cannot be undone.</Text><Button mode="contained" buttonColor={colors.danger} onPress={() => void endTimer()}>End interval</Button><Button mode="text" onPress={() => setConfirmingEnd(false)}>Keep going</Button></Surface>}
    {error && <Surface style={styles.error} elevation={0}><Text style={styles.errorText}>{error}</Text></Surface>}
    {finishedTimer && <Surface style={styles.finished} elevation={0} accessibilityLiveRegion="polite"><Text variant="titleLarge" style={styles.finishedTitle}>{finishedTimer.kind === "focus" ? "Focus round complete" : "Break complete"}</Text><Text style={styles.finishedCopy}>{finishedTimer.kind === "focus" ? "Take a breath, then choose what feels right." : "Ready when you are."}</Text><Button mode="contained" icon="coffee-outline" onPress={() => void startBreak()} style={styles.finishedButton}>Start short break</Button><Button mode="outlined" icon="refresh" onPress={() => void focusAgain()} style={styles.finishedButton}>Focus again</Button>{finishedTimer.kind === "focus" && finishedTimer.taskId && finishedTask && !finishedTask.completions.includes(todayKey()) && <Button mode="text" icon="check" onPress={() => void markDone()}>Mark task done</Button>}</Surface>}
  </AppScreen>;
}

const createStyles = (colors: { ink: string; muted: string; canvas: string; surface: string; line: string; primary: string; primarySoft: string; accent: string; danger: string; dangerSoft: string; warning: string; warningSoft: string }, isDark: boolean) => StyleSheet.create({
  eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 1.2, fontWeight: "800", marginTop: 6 }, titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 1 }, heading: { color: colors.ink, fontWeight: "800", letterSpacing: -0.6 }, summary: { color: colors.muted, marginTop: 4, marginBottom: 20 }, input: { backgroundColor: colors.surface, marginTop: 16 }, sound: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 12 }, soundTitle: { color: colors.ink, fontWeight: "700" }, soundCopy: { color: colors.muted, fontSize: 12, marginTop: 2 }, sync: { backgroundColor: colors.warningSoft, borderRadius: 14, padding: 12, marginBottom: 12 }, syncText: { color: colors.warning, lineHeight: 19 }, activeTask: { backgroundColor: colors.primarySoft, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 2 }, activeTaskLabel: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, activeTaskTitle: { color: colors.ink, fontWeight: "800", marginTop: 4 }, warning: { color: colors.warning, marginTop: 7, lineHeight: 18 }, empty: { backgroundColor: colors.surface, borderRadius: 18, padding: 17, borderWidth: 1, borderColor: colors.line, marginTop: 12 }, emptyTitle: { color: colors.ink, fontWeight: "700" }, emptyCopy: { color: colors.muted, marginVertical: 6, lineHeight: 19 }, endConfirm: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger, borderRadius: 18, padding: 16, marginTop: 12 }, endTitle: { color: colors.danger, fontWeight: "800" }, endCopy: { color: colors.danger, marginVertical: 7, lineHeight: 19 }, error: { backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12, marginTop: 12 }, errorText: { color: colors.danger }, finished: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.line, marginTop: 14 }, finishedTitle: { color: colors.ink, fontWeight: "800" }, finishedCopy: { color: colors.muted, marginTop: 5, marginBottom: 16 }, finishedButton: { marginBottom: 9 },
});
