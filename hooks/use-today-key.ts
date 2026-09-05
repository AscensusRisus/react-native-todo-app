import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { todayKey } from "@/lib/task-domain";

export function useTodayKey() {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    let alive = true;
    const refresh = () => { if (alive) setKey(todayKey()); };
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => { alive = false; clearInterval(interval); subscription.remove(); };
  }, []);

  return key;
}
