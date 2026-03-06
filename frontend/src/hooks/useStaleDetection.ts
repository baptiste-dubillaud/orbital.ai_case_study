import { useState, useEffect } from "react";
import { ReasoningItem } from "@/lib/types";

/**
 * Detects when nothing new has arrived during streaming for a given timeout.
 * Returns `true` when the stream appears stalled.
 */
export function useStaleDetection(
  streaming: boolean,
  reasoning: ReasoningItem[] | undefined,
  hasContent: boolean,
  timeoutMs = 500
): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!streaming || hasContent) {
      setStale(false);
      return;
    }

    // Something changed (reasoning ref updates on every chunk) — reset the
    // dead-man's switch.  If nothing new arrives within `timeoutMs` the
    // stream is considered stalled.
    setStale(false);
    const timer = setTimeout(() => setStale(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [streaming, reasoning, hasContent, timeoutMs]);

  return stale;
}
