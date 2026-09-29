import { useEffect, useState } from "react";
import { getHojeSummary, HOJE_REGISTRY_CHANGE_EVENT } from "../registry";
import type { HojeSummary } from "../types";

const EMPTY_SUMMARY: HojeSummary = { items: [] };

export function useHojeSummary(): { summary: HojeSummary; isLoading: boolean } {
  const [summary, setSummary] = useState<HojeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(initial = false) {
      if (initial) setIsLoading(true);
      try {
        const result = await getHojeSummary();
        if (!cancelled) {
          setSummary(result);
          setIsLoading(false);
        }
      } catch {
        // Keep the last valid snapshot if a provider is temporarily unavailable.
        if (!cancelled && initial) setIsLoading(false);
      }
    }

    void load(true);
    const refresh = () => void load();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const refreshOnRegistryChange = () => refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    window.addEventListener(HOJE_REGISTRY_CHANGE_EVENT, refreshOnRegistryChange);
    const interval = window.setInterval(refresh, 5 * 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      window.removeEventListener(HOJE_REGISTRY_CHANGE_EVENT, refreshOnRegistryChange);
      window.clearInterval(interval);
    };
  }, []);

  return { summary, isLoading };
}
