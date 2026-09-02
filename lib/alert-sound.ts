import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AlertSound } from "./focus-preferences";

export async function playAlertSound(sound: AlertSound | null) {
  if (!sound?.uri) return false;
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" });
  const player = createAudioPlayer(sound.uri);
  player.volume = 1;
  player.play();
  setTimeout(() => player.remove(), 30_000);
  return true;
}
