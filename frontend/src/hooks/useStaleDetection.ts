import { useState, useEffect, useRef } from "react";
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSnapshotRef = useRef("");

  useEffect(() => {
    if (!streaming || hasContent) {
      setStale(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      prevSnapshotRef.current = "";
      return;
    }

    // Build a lightweight snapshot — changes whenever new data arrives.
    const snapshot =
      String(reasoning?.length ?? 0) +
      ":" +
      (reasoning
        ?.map((r) =>
          r.type === "thinking"
            ? r.content.length
            : r.toolCall.toolCallId + (r.toolCall.result ? "R" : "")
        )
        .join(",") ?? "");

    if (snapshot !== prevSnapshotRef.current) {
      prevSnapshotRef.current = snapshot;
      setStale(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStale(true), timeoutMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [streaming, reasoning, hasContent, timeoutMs]);

  return stale;
}
