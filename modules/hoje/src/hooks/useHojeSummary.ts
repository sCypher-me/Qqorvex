import { useEffect, useState } from "react";
import { getHojeSummary } from "../registry";
import type { HojeSummary } from "../types";

const EMPTY_SUMMARY: HojeSummary = { items: [] };

export function useHojeSummary(): { summary: HojeSummary; isLoading: boolean } {
  const [summary, setSummary] = useState<HojeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getHojeSummary().then((result) => {
      if (!cancelled) {
        setSummary(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, isLoading };
}
